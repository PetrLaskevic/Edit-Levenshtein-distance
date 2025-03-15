import {WagnerFischer, globalCancelToken} from "./render.js";

let mazePicker = document.getElementById("mazePicker");
let mazeAppClassHolderVariable; //the instance of the maze app

function whichLineEnding(source) {
	var temp = source.indexOf('\n');
	if (source[temp - 1] === '\r')
		return 'CRLF' //Windows
	return 'LF' //Linux
}

function makePopup(heading, text, id){
	//For trusted input only (no input sanitisation here)
	//I use it for exceptions my program generates, and never any user input
	let div = document.createElement("div");
	div.className = "popup";
	//TODO: Add code to actually destroy the popup and not hide it when Ok is pressed
	div.innerHTML = `
	<p class="heading"><b>${heading}</b></p>
	<p>${text}</p>
	<div style="text-align: right;">
	<button id="${id}" class="ok" onclick="this.parentElement.parentElement.classList.add('hidden')">OK</button>
	</div>
	`;
	document.body.appendChild(div);
}

function start(){
	globalCancelToken.reset();
	try{
		if(mazeAppClassHolderVariable != undefined){
			mazeAppClassHolderVariable.zcelaHotovo = true;
		}
		mazeAppClassHolderVariable = new WagnerFischer("boats", "float");
		// mazeAppClassHolderVariable.renderMaze(text);
		// mazeAppClassHolderVariable.startDijkstra(); //entry point to our actual program
	}catch(error){
		console.error(error);
		//Show the user errors thrown by mazeTextToGraph for example
		makePopup(error.message, "", "error");
	}

}
document.getElementById("launch").addEventListener("click", start);
console.log("yes");