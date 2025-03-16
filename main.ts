import {WagnerFischer, globalCancelToken} from "./render.js";

let mazeAppClassHolderVariable!: WagnerFischer; //the instance of the maze app
let wordFrom = document.getElementById("firstWord") as HTMLInputElement;
let wordTo = document.getElementById("secondWord") as HTMLInputElement;

function makePopup(heading: string, text: string, id: string){
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
		mazeAppClassHolderVariable = new WagnerFischer(wordFrom.value, wordTo.value);
	}catch(error){
		console.error(error);
		//Show the user errors thrown by mazeTextToGraph for example
		//This `error as Error` is a TS technicality, since you technically can throw anything, not just Error
		//SMH, I only throw Error and don't have any dependencies which don't
		makePopup((error as Error).message, "", "error");
	}

}
document.getElementById("launch")!.addEventListener("click", start);
console.log("yes");