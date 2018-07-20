
const CONTROLS = ['up', 'down', 'left', 'right'];

export function init() {
  document.getElementById('controller').style.display = '';
}
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};
const trainStatusElement = document.getElementById('train-status');
export class Pong {
  constructor(canvasId="canvasPong", multiplier=8) {
    this.canvas = document.getElementById(canvasId)
    this.context = this.canvas.getContext("2d")
    this.width = this.canvas.width
    this.height = this.canvas.height
    this.pointsPlayer = 0
    this.pointsComputer = 0
    this.multiplier = multiplier
    this.up = false
    this.down = false
    this.speed = 3
    this.computerSpeed = 40

    this.playerSpeed = 0

    this.ball = null
    this.createBall()
    this.player = new Paddle(0, this.height / 2, this.height)
    this.computer = new Paddle(this.width - 10, this.height / 2, this.height)
    this.intervalID = null
    this.updateLogic()
  }
  updateMultiplier (multiplier) {
    this.multiplier = multiplier
  }
  createBall() {
    const x = this.width / 2
    const y = this.height / 2
    const b =  new Ball(x, y)
    this.ball = b
    return b
  }
  startGameplay() {
    this.stopGameplay()
    this.intervalID = setInterval(()=>{this.updateLogic()}, 1000 / 50); // 33 milliseconds = ~ 30 frames per sec
  }
  stopGameplay() {
    clearInterval(this.intervalID)
  }
  updatePlayerSpeed(value) {
    this.playerSpeed = value
  }
  updateLogic() {
    // move computer
    if (GameMath.withinRange(this.ball.y, 0, this.computer.y + this.computer.height * 0.25)) this.computerSpeed = -this.speed;
    else if (GameMath.withinRange(this.ball.y, this.computer.y + this.computer.height * 0.75, this.height)) this.computerSpeed = this.speed;
    else this.computerSpeed *= 0.95;
    this.computer.movePosition(this.computerSpeed);
    this.player.movePlayer(this.playerSpeed, this.multiplier)
    // show points
    //document.getElementById("points").innerHTML = "Player: " + pointsPlayer + " | Computer: " + pointsComputer;

    // draw elements
    this.context.clearRect(0, 0, this.width, this.height);
    this.ball.update();
    
    this.context.fillStyle = "#0ae";
    this.context.beginPath();
    this.context.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2, true);
    this.context.closePath();

    this.context.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    this.context.fillRect(this.computer.x, this.computer.y, this.computer.width, this.computer.height);
    this.context.fillStyle = "#f0f";
    this.context.fill();

    // collision - ball with border
    if (this.ball.x + this.ball.radius < 0) {
      this.pointsComputer++;
      this.createBall();
    }
    if (this.ball.x - this.ball.radius > this.width) {
      this.pointsPlayer++;
      this.createBall();
    }
    if ((this.ball.y - this.ball.radius < 0 && this.ball.speedY < 0) || (this.ball.y + this.ball.radius > this.height && this.ball.speedY > 0)) {
        this.ball.speedY *= -1;
    }
    // collision - ball with player or computer
    if ((this.player.hitTestPoint(this.ball.x, this.ball.y) && this.ball.speedX < 0) || (this.computer.hitTestPoint(this.ball.x, this.ball.y) && this.ball.speedX > 0)) {
      this.ball.speedX *= -1;
      this.ball.speedY *= 1.2;
      this.ball.speedX *= 1.2;
    }
  }
}
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speedX = Math.random() * 1.5 + 2;
    if (Math.random() < 0.5) this.speedX *= -1;
    this.speedY = Math.random() * 1.5 + 2;
    if (Math.random() < 0.5) this.speedY *= -1;
    this.radius = 4;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
  }
}

export class Paddle {
  constructor(x, y, yMoveArea) {
    this.x = x;
    this.y = y;
    this.yMoveArea = yMoveArea;
    this.width = 10;
    this.height = 50;
  }
  movePlayer(v, multiplier=10) {
    this.y = (this.y + v * multiplier).clamp(0, this.yMoveArea - this.height)
  }
  movePosition(deltaY) {
    this.y += deltaY;
    if (this.y < 0) this.y = 0;
    else if (this.y + this.height > this.yMoveArea) this.y = this.yMoveArea - this.height;
}

  hitTestPoint(x, y) {
    if (GameMath.withinRange(x, this.x, this.x + this.width) && GameMath.withinRange(y, this.y, this.y + this.height)) return true;
    else return false;
  }
}

class GameMath {
  static withinRange (value, min, max) {
    if (value >= min && value <= max) return true;
    else return false;
  }
}
