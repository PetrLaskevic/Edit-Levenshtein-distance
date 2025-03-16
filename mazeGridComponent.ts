export interface GridInterface{
    rows: number;
    columns: number;
    cellStyles: string;
}
//exporting for typing this.grid: ResponsiveGrid
class ResponsiveGrid extends HTMLElement implements GridInterface{
    //when the element is initialised like this, the rows & columns aren't set in the constructor
    // let grid = document.createElement("responsive-grid");
    // grid.rows = this.numberOfRows;
    // grid.columns = this.numberOfColumns;
    //I also don't want to give a default value and then have a weird behaviour if these aren't supplied
    //I prefer an uncaught error instead, so I guarantee this with not null assertion,
    // because else I'd have to throw errors explicitly to the same obvious result (if it is undefined, it is fairly easy to see)
    rows!: number;
    columns!: number;
    cellStyles!: string;
    cellSize!: number;
    maximumTextLengthSetSoFar: number;
    resizeCallback: (this: Window, ev: UIEvent) => void;
    maximumTextLengthElement?: HTMLDivElement;
    grid: HTMLDivElement;
    gapBetweenCells = 2; //in px

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        let rowsHTMLAttribute = this.getAttribute('rows');
        let columnsHTMLAttribute = this.getAttribute('rows');
        let cellStylesHTMLAttribute = this.getAttribute("cellStyles");

        if(rowsHTMLAttribute && columnsHTMLAttribute && cellStylesHTMLAttribute){
            this.rows = parseInt(rowsHTMLAttribute);
            this.columns = parseInt(columnsHTMLAttribute);
            this.cellStyles = cellStylesHTMLAttribute;
        }else{
            console.log("You haven't specified rows, columns, and cellStyles as HTML attributes. Then you have to specify them with JS properties instead.")
        }
        

        this.maximumTextLengthSetSoFar = 0;
        
        const style = `
            <style>
                :host {
                    display: block;
                }
                #grid {
                    display: grid;
                    width: 100%;
                    height: 100%;
                    /*padding here would create an overflow*/
                    /*padding: 5px;*/
                    gap: ${this.gapBetweenCells}px;
                }
                /*Remove border from cell, because borders are not the same width on the outer cells
                (becomes apparent when setting border: 5px solid #0a0a0d;)
                TODO: So, better use grid gap
                */
                .cell {
                    /*flexbox used to center text here*/
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-sizing: border-box; /* Include border in dimensions */
                    overflow: hidden; /* Ensure text does not overflow */
                    font-size: var(--fsize);
                    line-height: 1;
                    outline: ${this.gapBetweenCells}px solid #816d48;
                }
                @media (prefers-color-scheme: dark) {
                    :root{
                        color-scheme: dark;
                    }
                    .cell{
                        background: #0a0a0d;
                        outline-color: darkgreen;
                    }
                }
            </style>
        `;
        if(!this.shadowRoot){
            //To make Typescript happy, shouldn't happen
            throw Error("ShadowRoot undefined!");
        }
        this.shadowRoot.innerHTML = `
            ${style}
            <div id="grid"></div>
        `;
        this.grid = (this.shadowRoot.getElementById('grid') as HTMLDivElement);
        this.resizeCallback = this.handleResize.bind(this);
    }

    connectedCallback() {
        console.log("connected callback called");

        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.cellStyles;
        this.shadowRoot?.appendChild(link);

        this.createGrid();
        //to fix window.removeEventListener in disconnectedCallback
        //when this.handleResize.bind(this) was called there, 
        // it did not remove the event listener due to Function References Not Matching
        // Binding the function or using an anonymous function can create a new reference, causing removeEventListener to fail.
        //src: https://medium.com/@aleksej.gudkov/lwc-removeeventlistener-not-working-1f8dcb417e30
        //=> Storing the function reference with this.resizeCallback fixes the issue
        
        window.addEventListener('resize', this.resizeCallback);
    }

    disconnectedCallback() {
        console.log("disconnected callback ran");
        window.removeEventListener('resize', this.resizeCallback);
    }

    //public function, returns the cell at the specified index
    at(row: number, column: number): HTMLDivElement {
        if(!Number.isInteger(row) || !Number.isInteger(column)){
            throw Error("Arguments must be numbers");
        }
        if(row >= this.rows || column >= this.columns){
            throw Error(`IndexError, ${row}, ${column}, while size is ${this.rows}, ${this.columns}`);
        }
        
        if(this.grid.children.length == 0){
            throw Error("Grid has not been initialised properly, there are no cells! Make sure you connected the Grid to DOM (.appendChild or similar)")
        }
        //row coordinate * length of row 
        return (this.grid.children[row * this.columns + column] as HTMLDivElement);
    }

    addClassToCell(coordinates: [number, number], className: string){
        let row, column;
        [row, column] = coordinates;
        this.at(row, column).classList.add(className);
    }

    removeClassFromCell(coordinates: [number, number], className: string){
        let row, column;
        [row, column] = coordinates;
        this.at(row, column).classList.remove(className);
    }

    setTextToCell(coordinates: [number, number], text: string){
        text = String(text);
        let row, column;
        [row, column] = coordinates;
        //Right now under the assumption that shorter text than already is there cannot be assigned to a cell
        //(here it is like so, for other algorithms I will need to implement an ordered map, a tree)
        //needed to have a cell with longest text for tracking font size for adjustFontSize
        this.at(row, column).textContent = text;

        if(text.length > this.maximumTextLengthSetSoFar){
            this.maximumTextLengthSetSoFar = text.length;
            console.log("hleda se nova velikost", text.length, text);
            this.maximumTextLengthElement  =  this.at(row, column);
            if(!(this.shadowRoot && this.shadowRoot.host.parentElement)){
                throw Error("Grid not attached to DOM (=is detached = not visible)! Why is setTextToCell called then?");
            }
            const { clientWidth, clientHeight } = this.shadowRoot!.host.parentElement;
            this.cellSize = Math.min(clientWidth / this.columns, clientHeight / this.rows);

            this.findFontSizeForCell(this.maximumTextLengthElement, this.cellSize);
        }
        
    }
    
    handleResize() {
        //Calculates widths of cells
        if(!(this.shadowRoot && this.shadowRoot.host.parentElement)){
            throw Error("Grid not attached to DOM (=is detached = not visible)! Why is handleResize called then?");
        } 
        const { clientWidth, clientHeight } = this.shadowRoot.host.parentElement;

        // Determine the smallest dimension to ensure square cells
        this.cellSize = Math.min((clientWidth - (this.columns-1)*this.gapBetweenCells) / this.columns, (clientHeight - (this.columns-1)*this.gapBetweenCells) / this.rows);

        // Set the grid template with fixed cell size
        this.grid.style.gridTemplateColumns = `repeat(${this.columns}, ${this.cellSize}px)`;
        this.grid.style.gridTemplateRows = `repeat(${this.rows}, ${this.cellSize}px)`;

        this.adjustFontSize(this.grid, this.cellSize);
    }

    createGrid() {
        //Creates HTML fot the cells when the widget is constructed
        this.handleResize();
        if(!Number.isInteger(this.rows) || !Number.isInteger(this.columns)){
            throw Error("Grid dimensions are not defined!");
        }
        let divString = `<div class="cell"></div>`.repeat(this.rows * this.columns);
        this.grid.innerHTML = divString;
        // console.time("handleResize of empty grid");
        // this.handleResize();
        // console.timeEnd("handleResize of empty grid");
        // console.time("createGrid");
        // for (let i = 0; i < this.rows * this.columns; i++) {
        //     const cell = document.createElement('div');
        //     cell.className = 'cell';
        //     this.grid.appendChild(cell);
        // }
        // // this.adjustFontSize(this.grid, this.cellSize); //this call is unnecesary here because it will essentially be called when first content will be inserted
        // console.timeEnd("createGrid");
    }

    //finds optimal font size for the longest text cell
    //which will be the font size for all other cells
    findFontSizeForCell(cell: HTMLDivElement, cellSize: number){
        let fontSize = cellSize / 2; // Initial font size guess
        cell.style.fontSize = fontSize + 'px';
        cell.style.lineHeight = "1"; //in the base style, optional here

        // Decrease font size until it fits within the cell's dimensions
        while (fontSize > 0 && (cell.scrollWidth > cell.clientWidth || cell.scrollHeight > cell.clientHeight)) {
            fontSize--;
            cell.style.fontSize = fontSize + 'px';
        }
        cell.style = ""; //to not mix fsize and inline style
        this.grid.style.setProperty("--fsize", fontSize + "px");
        console.log("new font size", fontSize);
    }

    adjustFontSize(grid: HTMLDivElement, cellSize: number) {
        // Sets the maximum possible font size to cells, 
        // so that the text of maximum length in "this.maximumTextLengthElement" of length "this.maximumTextLengthSetSoFar" fits without overflow
        if(this.maximumTextLengthElement == undefined){
            //first time when the function is called from handleResize, the grid doesn't have any items
            //in such case, return (the previous for loop wouldnt't have done anything anyway )
            return;
        }
        this.findFontSizeForCell(this.maximumTextLengthElement, cellSize);
    }
}

customElements.define('responsive-grid', ResponsiveGrid);

export {ResponsiveGrid};

declare global {
    interface HTMLElementTagNameMap {
      "responsive-grid": ResponsiveGrid;
    }
  }
