/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from '@tensorflow/tfjs';

import {ControllerDataset} from './controller_dataset';
import * as ui from './ui';
import {Webcam} from './webcam';

// A webcam class that generates Tensors from the images from the webcam.
const webcam = new Webcam(document.getElementById('webcam'));

// The dataset object where we will store activations.
const controllerDataset = new ControllerDataset();
const CONTROLS_VALUES = [0, -1, 1];
const MAX_BATCH_SIZE = 32
let cnnNet;
let model;
let modelLayerShape; // This will be [7, 7, 1024] for our models, but could be different for other CNNs.
// Loads a Conv Net and returns a model that returns the internal activation
// we'll use as input to our classifier model.
async function loadCnnNet() {
  const modelPath = window.location.origin + '/serveDenseNet/model.json'
  const pretrainedNet = await tf.loadModel(modelPath);
  console.log(pretrainedNet.name)
  if (pretrainedNet.name.indexOf('densenet121') >=0 ) { // It is dense net 121
    const layer = pretrainedNet.getLayer('conv5_block16_concat');
    modelLayerShape = layer.outputShape.slice(1)
    return tf.model({inputs: pretrainedNet.inputs, outputs: layer.output});
  } else { // Otherwise we assume it is mobile net
    try {      
      const layer = pretrainedNet.getLayer('conv_pw_13_relu');
      modelLayerShape = layer.outputShape.slice(1)
      return tf.model({inputs: pretrainedNet.inputs, outputs: layer.output});
    } catch (error) {
      console.error(error, 'Known model-', pretrainedNet.name)
    }
  }
  // Return a model that outputs an internal activation.
  
}

// When the UI buttons are pressed, read a frame from the webcam and associate
// three valued images are labels 1, 0, 2 respectively in ui.js
ui.setExampleHandler(label => {
  tf.tidy(() => {
    const img = webcam.capture();
    controllerDataset.addExample(cnnNet.predict(img), CONTROLS_VALUES[label]);
    // Draw the preview thumbnail.
    ui.drawThumb(img, label);
  });
});

/**
 * Sets up and trains the regressor.
 */
async function train() {
  if (controllerDataset.xs == null) {
    throw new Error('Add some examples before training!');
  }

  // Creates a 2-layer fully connected model. By creating a separate model,
  // rather than adding layers to the cnnNet model, we "freeze" the weights
  // of the cnnNet model, and only train weights from the new model.
  model = tf.sequential({
    layers: [
      // Flattens the input to a vector so we can use it in a dense layer. While
      // technically a layer, this only performs a reshape (and has no training
      // parameters).
      tf.layers.flatten({inputShape: modelLayerShape}),
      // Layer 1
      tf.layers.dense({
        units: ui.getDenseUnits(),
        activation: 'relu',
        kernelInitializer: 'varianceScaling',
        useBias: true
      }),
      // Layer 2. The number of units of the last layer should 1
      // since it is a regression task.
      tf.layers.dense({
        units: 1,
        kernelInitializer: 'varianceScaling',
        useBias: false,
      })
    ]
  });

  // Creates the optimizers which drives training of the model.
  const optimizer = tf.train.adam(ui.getLearningRate());
  // We use binaryCrossentropy which is the loss function we use for
  // regression.
  model.compile({optimizer: optimizer, loss: 'meanSquaredError'});

  // We parameterize batch size as a fraction of the entire dataset because the
  // number of examples that are collected depends on how many examples the user
  // collects. This allows us to have a flexible batch size.
  let batchSize =
      Math.floor(controllerDataset.xs.shape[0] * ui.getBatchSizeFraction());
  if (!(batchSize > 0)) {
    throw new Error(
        `Batch size is 0 or NaN. Please choose a non-zero fraction.`);
  }
  if (batchSize > MAX_BATCH_SIZE) {
    batchSize = MAX_BATCH_SIZE
    console.info('Clamping batch size down to', MAX_BATCH_SIZE)
  }
  // Train the model! Model.fit() will shuffle xs & ys so we don't have to.
  model.fit(controllerDataset.xs, controllerDataset.ys, {
    batchSize,
    epochs: ui.getEpochs(),
    callbacks: {
      onBatchEnd: async (batch, logs) => {
        ui.trainStatus('Loss: ' + logs.loss.toFixed(5));
        await tf.nextFrame();
      }
    }
  });
}

let isPredicting = false;

async function predict() {
  ui.isPredicting();
  while (isPredicting) {
    const predictedValue = tf.tidy(() => {
      // Capture the frame from the webcam.
      const img = webcam.capture();

      // Make a prediction through cnnNet, getting the internal activation of
      // the cnnNet model.
      const activation = cnnNet.predict(img);

      // Make a prediction through our newly-trained model using the activation
      // from cnnNet as input.
      const predictions = model.predict(activation);

      // Returns the predicted value between -1~1.
      return predictions.as1D();
    });

    const value = (await predictedValue.data())[0];
    predictedValue.dispose();    
    ui.predictValue(value);
    await tf.nextFrame();
  }
  ui.donePredicting();
}

document.getElementById('train').addEventListener('click', async () => {
  ui.trainStatus('Training...');
  await tf.nextFrame();
  await tf.nextFrame();
  isPredicting = false;
  train();
});
document.getElementById('predict').addEventListener('click', () => {
  ui.startGame();
  isPredicting = true;
  predict();
});

document.getElementById('reset').addEventListener('click', () => {
  controllerDataset.clearExamples()
  ui.clear() // This will clear UI and stop the game play.
  // Stop the model.
  isPredicting = false
});
async function init() {
  try {
    await webcam.setup();
  } catch (e) {
    document.getElementById('no-webcam').style.display = 'block';
  }
  cnnNet = await loadCnnNet();

  // Warm up the model. This uploads weights to the GPU and compiles the WebGL
  // programs so the first time we collect data from the webcam it will be
  // quick.
  tf.tidy(() => cnnNet.predict(webcam.capture()));

  ui.init();
}

// Initialize the application.
init();
