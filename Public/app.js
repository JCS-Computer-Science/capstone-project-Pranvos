const socket = io();


const joinScreen = document.getElementById('join-screen');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');
const chatInput = document.getElementById('chat-input');
const currentWordSpan = document.getElementById('current-word');
const drawerNameSpan = document.getElementById('drawer-name');
const timeLeftSpan = document.getElementById('time-left');
const roundInfoSpan = document.getElementById('round-info');

let drawing = false;
let currentColor = '#000000';
let currentBrushSize; 
let lastX = 0;
let lastY = 0;
let isDrawer = false;