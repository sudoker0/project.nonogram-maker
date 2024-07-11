function qSel<T extends Element>(selector: string) {
    return document.querySelector<T>(selector)
}

const canvas =
    qSel<HTMLCanvasElement>("#canvas")
const ctx = canvas.getContext("2d")

const controlPanel =
    qSel<HTMLElement>("#control")
const controlButton =
    qSel<HTMLButtonElement>("#control_button")

const widthInput =
    qSel<HTMLInputElement>("#width")
const heightInput =
    qSel<HTMLInputElement>("#height")
const exportedInput =
    qSel<HTMLTextAreaElement>("#exportData")
const importedInput =
    qSel<HTMLTextAreaElement>("#importData")

const resetPosButton =
    qSel<HTMLButtonElement>("#reset_pos")
const exportButton =
    qSel<HTMLButtonElement>("#export")
const importButton =
    qSel<HTMLButtonElement>("#import")
const shareButton =
    qSel<HTMLButtonElement>("#share")
const clearAllButton =
    qSel<HTMLButtonElement>("#clear_all")


let puzzleData = [[false]]
let alreadyDrawnData = [[false]]
let puzzleState = {
    squareSize: 64,
    offsetX: 16,
    offsetY: 16,
    gridZoom: 1,
    isDrawing: false,
    isDragging: false,
    previousMouseCoord: {
        x: -1,
        y: -1
    }
}

let puzzleConfig = {
    width: 0,
    height: 0,

    font: "Noto Sans Mono",
    fontSize: 32,
    textPadding: 16,
    lineColor: "#888888",
    lineThickness: 2,
    filledColor: "#000000",
    emptyColor: "#ffffff"
}

// -----------------------------------

function validateNumberInput(ev: Event) {
    const targetElm = ev.target as HTMLInputElement
    console.log(targetElm.value)
    if (!targetElm.checkValidity()) {
        targetElm.value = "8"
    }
}

function resizeCanvas() {
    canvas.width = innerWidth
    canvas.height = innerHeight
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function getRowClues(matrix: boolean[][]) {
    return matrix.map(row => {
        let clues = []
        let count = 0
        for (let cell of row) {
            if (cell) {
                count++
            } else {
                if (count > 0) {
                    clues.push(count)
                    count = 0
                }
            }
        }
        if (count > 0) {
            clues.push(count)
        }
        return clues.length ? clues : [0]
    }) as number[][]
}

function getColumnClues(matrix: boolean[][]) {
    let columnClues: number[][] = []
    for (let col = 0; col < matrix[0].length; col++) {
        let clues = []
        let count = 0
        for (let row = 0; row < matrix.length; row++) {
            if (matrix[row][col]) {
                count++
            } else {
                if (count > 0) {
                    clues.push(count)
                    count = 0
                }
            }
        }
        if (count > 0) {
            clues.push(count);
        }
        columnClues.push(clues.length ? clues : [0])
    }
    return columnClues
}

function createNonogramData() {
    return {
        column: getColumnClues(puzzleData),
        row: getRowClues(puzzleData)
    }
}

function resizeGridData() {
    if (puzzleData.length == puzzleConfig.width && puzzleData[0].length == puzzleConfig.height) return
    let newPuzzleData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))

    for (let i = 0; i < Math.min(puzzleData.length, puzzleConfig.width); i++) {
        for (let j = 0; j < Math.min(puzzleData[0].length, puzzleConfig.height); j++) {
            newPuzzleData[i][j] = puzzleData[i][j]
        }
    }

    puzzleData = newPuzzleData
}

function drawGrid() {
    //? draw box
    for (let i = 0; i < puzzleConfig.width; i++) {
        for (let j = 0; j < puzzleConfig.height; j++) {
            ctx.beginPath()
            if (puzzleData[i][j]) {
                ctx.fillStyle = puzzleConfig.filledColor
            } else {
                ctx.fillStyle = puzzleConfig.emptyColor
            }
            ctx.rect(
                i * puzzleState.squareSize + puzzleState.offsetX,
                j * puzzleState.squareSize + puzzleState.offsetY,
                puzzleState.squareSize,
                puzzleState.squareSize,
            )
            ctx.closePath()
            ctx.fill()
        }
    }

    //? draw line
    ctx.strokeStyle = puzzleConfig.lineColor
    ctx.lineWidth = puzzleConfig.lineThickness
    for (let i = 0; i < puzzleConfig.width + 1; i++) {
        ctx.beginPath()
        ctx.moveTo(
            i * puzzleState.squareSize + puzzleState.offsetX,
            puzzleState.offsetY
        )
        ctx.lineTo(
            i * puzzleState.squareSize + puzzleState.offsetX,
            puzzleConfig.height * puzzleState.squareSize + puzzleState.offsetY
        )
        ctx.closePath()
        ctx.stroke()
    }

    for (let i = 0; i < puzzleConfig.height + 1; i++) {
        ctx.beginPath()
        ctx.moveTo(
            puzzleState.offsetX,
            i * puzzleState.squareSize + puzzleState.offsetY
        )
        ctx.lineTo(
            puzzleConfig.width * puzzleState.squareSize + puzzleState.offsetX,
            i * puzzleState.squareSize + puzzleState.offsetY
        )
        ctx.closePath()
        ctx.stroke()
    }

    //? draw number
    ctx.font = `${puzzleConfig.fontSize}px ${puzzleConfig.font}`
    const nonogramData = createNonogramData()
    for (let i = 0; i < nonogramData.column.length; i++) {
        ctx.beginPath()
        ctx.textAlign = "end"
        ctx.textBaseline = "top"
        ctx.fillStyle = puzzleConfig.lineColor
        ctx.closePath()
        ctx.fillText(
            nonogramData.column[i].join(" "),
            puzzleState.offsetX - puzzleConfig.textPadding,
            i * puzzleState.squareSize + puzzleState.offsetY + puzzleConfig.fontSize / 2
        )
    }

    for (let i = 0; i < nonogramData.row.length; i++) {
        ctx.beginPath()
        ctx.textAlign = "start"
        ctx.textBaseline = "bottom"
        ctx.fillStyle = puzzleConfig.lineColor
        ctx.closePath()
        nonogramData.row[i].reverse()
        for (let j = 0; j < nonogramData.row[i].length; j++) {
            ctx.fillText(
                nonogramData.row[i][j].toString(),
                i * puzzleState.squareSize + puzzleState.offsetX + puzzleState.squareSize / 2,
                puzzleState.offsetY - j * puzzleConfig.fontSize * 2 - puzzleConfig.textPadding,
            )
        }
    }
}

function drawBox(ev: MouseEvent) {
    if (!puzzleState.isDrawing) return
    const coord = {
        x: Math.floor((ev.offsetX - puzzleState.offsetX) / puzzleState.squareSize),
        y: Math.floor((ev.offsetY - puzzleState.offsetY) / puzzleState.squareSize),
    }
    if (coord.x < 0 || coord.y < 0 || coord.x >= puzzleConfig.width || coord.y >= puzzleConfig.height) return
    if (alreadyDrawnData[coord.x][coord.y]) return

    puzzleData[coord.x][coord.y] = !puzzleData[coord.x][coord.y]
    alreadyDrawnData[coord.x][coord.y] = true
}

function moveGrid(ev: MouseEvent) {
    if (!puzzleState.isDragging) return
    const delta = {
        x: ev.offsetX - puzzleState.previousMouseCoord.x,
        y: ev.offsetY - puzzleState.previousMouseCoord.y,
    }

    puzzleState.offsetX += delta.x
    puzzleState.offsetY += delta.y

    puzzleState.previousMouseCoord.x = ev.offsetX
    puzzleState.previousMouseCoord.y = ev.offsetY
}

function centerPuzzle() {
    const center = {
        x: (innerWidth - puzzleConfig.width * puzzleState.squareSize) / 2,
        y: (innerHeight - puzzleConfig.height * puzzleState.squareSize) / 2,
    }
    puzzleState.offsetX = center.x
    puzzleState.offsetY = center.y
}

function exportPuzzle() {
    const totalBits = puzzleConfig.width * puzzleConfig.height
    const totalBytes = 2 + Math.ceil(totalBits / 8)
    const packedArray = new Uint8Array(totalBytes)

    packedArray[0] = puzzleConfig.width
    packedArray[1] = puzzleConfig.height

    let bitIndex = 0
    for (let i = 0; i < puzzleConfig.width; i++) {
        for (let j = 0; j < puzzleConfig.height; j++) {
            if (puzzleData[i][j]) {
                const byteIndex = 2 + Math.floor(bitIndex / 8)
                const bitOffset = bitIndex % 8
                packedArray[byteIndex] |= (1 << bitOffset)
            }
            bitIndex++
        }
    }

    exportedInput.value = btoa(String.fromCharCode.apply(null, packedArray))
}

function importPuzzle() {
    try {
        const rawData = atob(importedInput.value)
        const len = rawData.length
        const packedArray = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            packedArray[i] = rawData.charCodeAt(i)
        }

        const width = packedArray[0]
        const height = packedArray[1]
        const newPuzzleData = Array.from({ length: width }, () => Array.from({ length: height }, () => false))
        const rawBool: boolean[] = []
        for (let i = 2; i < packedArray.length; i++) {
            for (let j = 0; j < 8; j++) {
                rawBool.push((packedArray[i] & (1 << j)) != 0)
            }
        }

        let index = 0
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                newPuzzleData[i][j] = rawBool[index]
                index++
            }
        }

        widthInput.value = width.toString()
        heightInput.value = height.toString()
        puzzleData = newPuzzleData
    } catch (e) {
        alert("Invalid input specified!")
    }
}

// -----------------------------------

function init() {
    widthInput.value = "8"
    heightInput.value = "8"
    puzzleConfig.width = Number(widthInput.value)
    puzzleConfig.height = Number(heightInput.value)
    puzzleData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))
    centerPuzzle()
    requestAnimationFrame(update)
}

function update() {
    puzzleConfig.width = Number(widthInput.value) || puzzleConfig.width
    puzzleConfig.height = Number(heightInput.value) || puzzleConfig.height
    resizeCanvas()
    resizeGridData()
    drawGrid()
    requestAnimationFrame(update)
}

// -----------------------------------

exportButton.addEventListener("click", exportPuzzle)
importButton.addEventListener("click", importPuzzle)

controlButton.addEventListener("click", () => {
    controlPanel.classList.toggle("off")
})
resetPosButton.addEventListener("click", centerPuzzle)
clearAllButton.addEventListener("click", () => {
    puzzleData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))
})

widthInput.addEventListener("input", validateNumberInput)
heightInput.addEventListener("input", validateNumberInput)

// canvas.addEventListener("contextmenu", e => e.preventDefault())
canvas.addEventListener("mousedown", (ev) => {
    if (puzzleState.isDrawing || puzzleState.isDragging) return
    switch (ev.button) {
        case 0:
            puzzleState.isDrawing = true
            alreadyDrawnData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))
            drawBox(ev)
            break
        case 2:
            puzzleState.isDragging = true
            document.body.style.cursor = "all-scroll"
            puzzleState.previousMouseCoord.x = ev.offsetX
            puzzleState.previousMouseCoord.y = ev.offsetY
            break
    }
})
canvas.addEventListener("mouseup", () => {
    document.body.style.cursor = "default"
    puzzleState.isDrawing = false
    puzzleState.isDragging = false
})
canvas.addEventListener("mouseleave", () => {
    document.body.style.cursor = "default"
    puzzleState.isDrawing = false
    puzzleState.isDragging = false
})
canvas.addEventListener("mousemove", (ev) => {
    drawBox(ev)
    moveGrid(ev)
})

addEventListener("DOMContentLoaded", init)