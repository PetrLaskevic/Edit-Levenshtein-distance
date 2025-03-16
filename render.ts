import {GridInterface, ResponsiveGrid} from "./mazeGridComponent.js"
export const globalCancelToken = {
	cancelled: false,
	allTimeouts: new Set<number>(),
	cancelAll: function () {
	  this.cancelled = true;
	  for(let timeoutID of this.allTimeouts){
		clearTimeout(timeoutID);
	  }
	},
	reset: function () {
		this.cancelAll();
		this.cancelled = false;
	}
};

//originally https://stackoverflow.com/a/53452241/11844784
//for a cancellable version I basically built https://stackoverflow.com/a/25345746 
// (from https://stackoverflow.com/questions/25345701/how-to-cancel-timeout-inside-of-javascript-promise), the 2014 solution
// the 2021 soluton supposedly uses a built in AbortController 
// (which AFAIK has the advantage that it works on any function built on promises, including built in fetch - so is a way to cancel fetch)
//But here, I believe this clearInterval / clearTimeout is adequate (btw fun fact, the clearInterval / clearTimeout are interchangeable (src MDN))
function wait(ms: number) {
	if(ms > 0){
		return new Promise((resolve, reject) => {
			const timeoutID = setTimeout(() => {
				globalCancelToken.allTimeouts.delete(timeoutID);
				if (!globalCancelToken.cancelled) {
					resolve(ms)
				}
			}, ms );
			globalCancelToken.allTimeouts.add(timeoutID);
		})
	}else{
		return;
	}
}

function stopAllAnimationDelays(){
	globalCancelToken.cancelAll();
}

let animationDelay = document.getElementById("visualisationDelayPicker");

class WagnerFischer{
	wordFrom: string;
	wordTo: string;
	numberOfRows: number;
	numberOfColumns: number;
	grid: ResponsiveGrid;
	resultParagraph: HTMLElement;
	constructor(wordFrom: string, wordTo: string){
		this.wordFrom = "_" + wordFrom;
		this.wordTo = "_" + wordTo;
		this.numberOfRows = this.wordFrom.length + 1;
		this.numberOfColumns = this.wordTo.length + 1;
		//remove the old grid from DOM (for the previously selected maze) (until now it was simply hidden)
		document.querySelector("responsive-grid")?.remove();
		let grid = document.createElement("responsive-grid");
		grid.rows = this.numberOfRows;
		grid.columns = this.numberOfColumns;
		grid.cellStyles = "./visualisation.css";
		document.querySelector("main")!.appendChild(grid);
		this.grid = grid;
		this.resultParagraph = (document.querySelector(".presentResult") as HTMLElement);
		this.resultParagraph.innerHTML = "<br>";
		this.renderMaze();
	}

	renderMaze(){
		for(const [index, char] of Array.from(this.wordTo).entries()){
			this.grid.setTextToCell([index + 1,0], char);
		}
	}
}

export {WagnerFischer};