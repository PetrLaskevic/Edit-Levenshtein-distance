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

let animationDelay = document.getElementById("visualisationDelayPicker") as HTMLInputElement;
let statusParagraph = document.querySelector(".presentResult") as HTMLParagraphElement;

class WagnerFischer{
	wordFrom: string;
	wordTo: string;
	numberOfRows: number;
	numberOfColumns: number;
	grid: ResponsiveGrid;
	resultParagraph: HTMLElement;
	constructor(wordFrom: string, wordTo: string){
		this.wordFrom = " _" + wordFrom;
		this.wordTo = " _" + wordTo;
		this.numberOfRows = this.wordFrom.length;
		this.numberOfColumns = this.wordTo.length;
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

	unselectAllLettersHorizontal(){
		for(let column = 0; column < this.wordTo.length; column++){
			this.grid.removeClassFromCell([0,column], "selectedHorizontal");
		}
	}

	setStatusParagraph(row: number, column: number){
		const verticalSpan = document.createElement('span');
		verticalSpan.className = 'selectedVertical';
		verticalSpan.textContent = this.wordFrom.slice(1, row + 1);

		const horizontalSpan = document.createElement('span');
		horizontalSpan.className = 'selectedHorizontal';
		horizontalSpan.textContent = this.wordTo.slice(1, column + 1);
		statusParagraph.textContent = '';
		statusParagraph.append('Comparing ', verticalSpan, ' and ', horizontalSpan);
	}
	setStatusParagraphResult(){
		const verticalSpan = document.createElement('span');
		verticalSpan.className = 'selectedVertical';
		verticalSpan.textContent = this.wordFrom.slice(2);

		const horizontalSpan = document.createElement('span');
		horizontalSpan.className = 'selectedHorizontal';
		horizontalSpan.textContent = this.wordTo.slice(2);

		const distanceSpan = document.createElement('span');
		distanceSpan.textContent = this.grid.at(this.numberOfRows - 1, this.numberOfColumns - 1);

		statusParagraph.textContent = '';
		statusParagraph.append('Edit distance from ', verticalSpan, ' to ', horizontalSpan, ' is ', distanceSpan);
	}


	async renderMaze(){
		//set first column as the word from
		for(const [index, char] of Array.from(this.wordFrom).entries()){
			this.grid.setTextToCell([index,0], char);
		}
		//set first row as the word to
		for(const [index, char] of Array.from(this.wordTo).entries()){
			this.grid.setTextToCell([0, index], char);
		}
		//initialise the second row, show how many characters need to be inserted to get from "_" to "f", "fl", "flo" etc.
		// (len of the said subistring => base case for the algorithm)
		for(let charsToInsertFromEmptyString = 0; charsToInsertFromEmptyString < this.wordTo.length - 1; charsToInsertFromEmptyString++){
			this.grid.setTextToCell([1, charsToInsertFromEmptyString+1], charsToInsertFromEmptyString);
		}
		//initialise the second column, show how many characters need to be removed to get from "b", "bo", "boa", etc. to "_":
		// (len of the said subistring => base case for the algorithm)
		for(let charsToDeleteToEmptyString = 0; charsToDeleteToEmptyString < this.wordFrom.length - 1; charsToDeleteToEmptyString++){
			this.grid.setTextToCell([charsToDeleteToEmptyString+1, 1], charsToDeleteToEmptyString);
		}

		for(let row = 2; row < this.numberOfRows; row++ ){
			this.unselectAllLettersHorizontal();
			this.grid.addClassToCell([row, 0], "selectedVertical");
			for(let column = 2; column < this.numberOfColumns; column++){
				this.grid.addClassToCell([0,column], "selectedHorizontal");
				
				this.grid.addClassToCell([row, column], "from");
				//Vulnerable to ""<img src='x' onerror='alert(1);console.log("t")'> => alert will be drawn 
				// statusParagraph.innerHTML = `Comparing <span class="selectedVertical">${this.wordFrom.slice(1,row+1)}</span> and <span class="selectedHorizontal">${this.wordTo.slice(1, column+1)}</span>`
				this.setStatusParagraph(row, column);

				let deleteOption = this.grid.at(row, column - 1);
				let replaceOption = this.grid.at(row - 1, column - 1);
				let insertOption = this.grid.at(row - 1, column);
				let minStepsOption = Math.min(...[deleteOption, replaceOption, insertOption].map(Number));

				this.grid.addClassToCell([row, column - 1], "considered");
				this.grid.addClassToCell([row - 1, column - 1], "considered");
				this.grid.addClassToCell([row - 1, column], "considered");

				if(this.wordFrom[row] == this.wordTo[column]){
					this.grid.setTextToCell([row,column], minStepsOption);
				}else{
					this.grid.setTextToCell([row,column], minStepsOption + 1);
				}
				await wait(Number(animationDelay.value));
				this.grid.removeClassFromCell([row, column], "from");
				this.grid.removeClassFromCell([row, column - 1], "considered");
				this.grid.removeClassFromCell([row - 1, column - 1], "considered");
				this.grid.removeClassFromCell([row - 1, column], "considered");
			}
		};
		this.grid.addClassToCell([this.numberOfRows-1, this.numberOfColumns-1], "from");
		// statusParagraph.innerHTML = `Edit distance from <span class="selectedVertical">${this.wordFrom.slice(2)}</span> to <span class="selectedHorizontal">${this.wordTo.slice(2)}</span> is <span>${this.grid.at(this.numberOfRows-1,this.numberOfColumns-1)}</span>`
		this.setStatusParagraphResult();
	}
}

export {WagnerFischer};