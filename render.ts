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
		this.main();
	}

	unselectAllLettersHorizontal(){
		for(let column = 0; column < this.wordTo.length; column++){
			this.grid.removeClassFromCell([0,column], "selectedHorizontal");
		}
	}
	 
	//Safer version of: 
	//statusParagraph.innerHTML = `Comparing <span class="selectedVertical">${this.wordFrom.slice(1,row+1)}</span> and <span class="selectedHorizontal">${this.wordTo.slice(1, column+1)}</span>`
	//(.innerHTML was vulnerable to: `""<img src='x' onerror='alert(1);console.log("t")'>` => an alert will be drawn
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
	//Safer version of:
	// statusParagraph.innerHTML = `Edit distance from <span class="selectedVertical">${this.wordFrom.slice(2)}</span> to <span class="selectedHorizontal">${this.wordTo.slice(2)}</span> is <span>${this.grid.at(this.numberOfRows-1,this.numberOfColumns-1)}</span>`
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

	//Finds a minimum in list of "tuples" according to the "key" = the index in the tuple supplied
	//Example: `min([["some", 1], ["text"],2], 1)` => indexToMinBy=1 means the minimum will be found by comparing the second item in each tuple
	//Implemented because Math.min does not support anything but an array of numbers
	min<T extends any[]>(list: T[], indexToMinBy: number): T{
		let minimumSoFar = Number.POSITIVE_INFINITY;
		let minimimumItem;
		if(list.length == 0){
			throw Error("You probably didn't want to pick the minimum item in an empty list");
		}
		for(let item of list){
			if(indexToMinBy + 1 > item.length){
				throw Error(`IndexError: indexToMinBy ${indexToMinBy} bigger than ${item} length ${item.length}`);
			}
			if(!Number.isInteger(item[indexToMinBy])){
				throw Error(`The tuple's item ${item[indexToMinBy]} at index ${indexToMinBy} is not a number! (${item})`);
			}
			if(item[indexToMinBy] < minimumSoFar){
				minimumSoFar = item[indexToMinBy];
				minimimumItem = item;
			}
		}
		//guaranteed to return some item, as anything I put in there is < than Number.POSITIVE_INFINITY
		return minimimumItem as T;
	}

	async main(){
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
		this.setStatusParagraphResult();
		await wait(Number(animationDelay.value));
		this.backtrack();
	}

	async backtrack(){
		//the result is always in the bottom right row
		let column = this.numberOfColumns - 1;
		let row = this.numberOfRows - 1;
		this.grid.addClassToCell([row, column], "prev");
		while(row != 1 || column != 1){
			console.log(row, column);
			//unfortunately, typescript doesn't see that during this filter, the type of the tuples doesn't change
			//so either a type guard or type assertion is needed
			//It's reflected in the filter value parameter being flattened to `value: (string | number | number[])[]`, not reflecting the order of types I specified
			let options: [string, number, [number, number]][] = [
				["delete", 	Number(this.grid.at(row, column - 1)), 		[ 0, -1]],
				["replace", Number(this.grid.at(row - 1, column - 1)), 	[-1, -1]],
				["insert", 	Number(this.grid.at(row - 1, column)), 		[-1,  0]]
			].filter((value): value is [string, number, [number, number]] => !Number.isNaN(value[1])); //for the first column / row (where there are letters)
			
			//visualize the options
			options.forEach((value) => {
				let [vecRow, vecColumn] = value[2]; //the [ 0, -1] vector in options
				this.grid.addClassToCell([row + vecRow, column + vecColumn], "considered");
			});
			statusParagraph.textContent = "Choosing between these options"
			await wait(Number(animationDelay.value)*1.5);

			options.forEach((value) => {
				let [vecRow, vecColumn] = value[2]; //the [ 0, -1] vector in options
				this.grid.removeClassFromCell([row + vecRow, column + vecColumn], "considered");
				this.grid.addClassToCell([row + vecRow, column + vecColumn], "previously-considered");
			});

			let [minStepsOption,value,vector] = this.min(options, 1);
			row += vector[0];
			column += vector[1];
			this.grid.addClassToCell([row,column],"chose");
			statusParagraph.innerHTML = `Chose option <span class='choseText'>${minStepsOption}</span>, value <span class='choseText'>${value}</span>`;
			await wait(Number(animationDelay.value)*2);
			this.grid.removeClassFromCell([row,column],"chose");
			this.grid.addClassToCell([row,column],"prev");
			await wait(Number(animationDelay.value));
		}
		this.visualiseDiff();
	}
	async visualiseDiff(){
		//walks down from top left corner to bottom right corner along the cells selected by backtrack() to visualise the changes
		let row = 1;
		let column = 1;
		while(row != this.numberOfRows - 1 || column != this.numberOfColumns - 1){
			console.log("ran", row, column, row != this.numberOfRows - 1, column != this.numberOfColumns - 1, this.numberOfRows, this.numberOfColumns);
			
			type Operation = "Insert" | "Delete" | "Replace";
			type Option = [Operation, valueAtCell: number, vector: [number, number]];
			let options: Option[] = [
				["Insert", 	Number(this.grid.atNoExcept(row, column + 1)), 		[0, 1]], //going there is an Insert operation
				["Delete", 	Number(this.grid.atNoExcept(row + 1, column)), 		[1, 0]], //going there is an Delete operation
				["Replace", Number(this.grid.atNoExcept(row + 1, column + 1)), 	[1, 1]] //going there is a Replace operation
			];
			
			options = options.filter((value) => //has to be split up like this ( .filter not in the declaration) because of TS
				{	
					let vector = value[2];
					return !Number.isNaN(value[1]) && //filter out out of bounds: Number(undefined) is NaN
					this.grid.elementAt(row + vector[0], column + vector[1]).classList.contains("prev") //to go through the same cells the backtrack() suggested
				}
			);

			let [minStepsOption,value,vector] = this.min(options, 1);
			let minStepsOptionRow = row + vector[0];
			let minStepsOptionColumn = column + vector[1];
			
			this.grid.addClassToCell([minStepsOptionRow, minStepsOptionColumn], "roundBorder");

			//Tell the user what operations we've done
			const operationVerbToNoun = {
				"Insert": "insertion",
				"Delete": "deletion",
				"Replace": "replacement"
			} as const;

			if(Number(this.grid.at(row, column)) == value){
				//for all operations - when two adjacent cells in the optimal path have the same number of steps from the beginning
				//for example for deletion "baaats" to "flaaa" or "horse" to "ros"
				statusParagraph.textContent = `Both words have the same letter ${this.wordTo[minStepsOptionColumn]}, no ${operationVerbToNoun[minStepsOption]} needed`;
			}else{
				if(minStepsOption == "Replace"){
					statusParagraph.textContent = `Replace ${this.wordFrom[minStepsOptionRow]} with ${this.wordTo[minStepsOptionColumn]}`;
				}else if(minStepsOption == "Delete"){
					statusParagraph.textContent = `Delete ${this.wordFrom[minStepsOptionRow]}`;
				}else if(minStepsOption == "Insert"){
					statusParagraph.textContent = `Insert ${this.wordTo[minStepsOptionColumn]}`;
				}
			}

			[row, column] = [minStepsOptionRow, minStepsOptionColumn];
			await wait(Number(animationDelay.value)*3);
			this.grid.removeClassFromCell([row, column], "roundBorder");
		}
	}
}

export {WagnerFischer};