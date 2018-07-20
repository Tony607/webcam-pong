# [How to train neural network on browser: Transfer Learning to play Pong via the Webcam](https://www.dlology.com/blog/how-to-train-neural-network-on-browser/)

## Let's play the game first
Instruction to get the web application served locally on your computer,

- Download the [dist.zip](https://github.com/Tony607/webcam-pong/releases/download/V0.1/dist.zip) and extract it to your local machine.
- Install an HTTP server package, my personal recommendation, install http-server globally by npm,
```
npm install -g http-server
```
You ask what is npm? It is a package installer for Node.js like pip for Python and can be acquired [here](https://nodejs.org/en/).
- Run this line a command line where the dist folder is located to serve the web app on your local machine at a port, say 1234.
```
http-server dist --cors -p 1234 -s
```
- Point a browser window to http://localhost:1234 and start playing, I personally have tested on Chrome and Firefox.

## Build and serve
```
yarn
yarn build
http-server dist --cors -p 1234 -s
```
`http-server` will serve the `dist` folder content on port you specified, `1234` in our case. The `-s` argument suppresses log messages from output.

## Swap to another pre-trained model
- Copy the exported tfjs model folder to `dist` like the `serveDenseNet`.
Locate the `index.js` in root folder, change `serveDenseNet` to your model folder's name and make sure the json file name is `model.json` in your model folder.
- Check the layer name of your model and change it accordingly, set in `pretrainedNet.getLayer()`. This is normally the last convolutional layer's name you can find out either in Keras `model.summary()` call or by searching for it in tfjs's `pretrainedNet.layers`, or by manually locate it in the `model.json` file from your model folder.
- Rebuild with 
```
yarn build
```

Read the tutorial for more information.