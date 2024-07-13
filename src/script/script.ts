function qSel<T extends Element>(selector: string) {
    return document.querySelector<T>(selector)
}

const canvas =
    qSel<HTMLCanvasElement>("#canvas")
const ctx = canvas.getContext("2d", { alpha: false })

const controlPanel =
    qSel<HTMLElement>("#control")
const controlButton =
    qSel<HTMLButtonElement>("#control_button")

const exportedInput =
    qSel<HTMLTextAreaElement>("#exportData")
const importedInput =
    qSel<HTMLTextAreaElement>("#importData")

const resetPosButton =
    qSel<HTMLButtonElement>("#reset_pos")
const exportButton =
    qSel<HTMLButtonElement>("#export")
const exportAsPNG =
    qSel<HTMLButtonElement>("#export_png")
const exportAsPNGUnsolved =
    qSel<HTMLButtonElement>("#export_png_unsolved")
const importButton =
    qSel<HTMLButtonElement>("#import")
const shareButton =
    qSel<HTMLButtonElement>("#share")
const clearAllButton =
    qSel<HTMLButtonElement>("#clear_all")

let puzzleData = [[false]]
let alreadyDrawnData = [[false]]

let puzzleState = {
    offsetX: 16,
    offsetY: 16,
    zoom: 1,
    isDrawing: false,
    isDragging: false,
    previousMouseCoord: {
        x: -1,
        y: -1
    }
}

let puzzleConfig = {
    width: 8,
    height: 8,
    fontSize: 32,
    textPadding: 16,
    lineThickness: 2,
    lineColor: "#888888",
    filledColor: "#000000",
    emptyColor: "#ffffff",
    squareSize: 64,
    font: "Noto Sans Mono",

    zoomSpeed: 1,
}

// -----------------------------------

function validateInput(defaultValue: string) {
    return (ev: Event) => {
        const targetElm = ev.target as HTMLInputElement
        if (targetElm.checkValidity()) return
        targetElm.value = defaultValue
    }
}

function updatePuzzleConfig(key: keyof typeof puzzleConfig, value: string) {
    const elm = qSel<HTMLInputElement>(`.puzzleConfig[name=${key}]`)
    if (!elm) throw new Error("invalid key for puzzleConfig")
    elm.value = value
    elm.dispatchEvent(new Event("input"))
}

function resizeCanvas() {
    canvas.width = innerWidth
    canvas.height = innerHeight
}

function drawBgCanvas() {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function clearPuzzle() {
    puzzleData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))
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

function drawPuzzle(hideAnswer = false) {
    //? draw box
    for (let i = 0; i < puzzleConfig.width; i++) {
        for (let j = 0; j < puzzleConfig.height; j++) {
            ctx.beginPath()
            ctx.fillStyle = puzzleData[i][j]
                ? puzzleConfig.filledColor
                : puzzleConfig.emptyColor

            ctx.fillStyle = hideAnswer
                ? puzzleConfig.emptyColor
                : ctx.fillStyle

            ctx.rect(
                puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetX,
                puzzleState.zoom * j * puzzleConfig.squareSize + puzzleState.offsetY,
                puzzleState.zoom * puzzleConfig.squareSize,
                puzzleState.zoom * puzzleConfig.squareSize,
            )
            ctx.closePath()
            ctx.fill()
        }
    }

    //? draw line
    ctx.strokeStyle = puzzleConfig.lineColor
    ctx.lineWidth = puzzleState.zoom * puzzleConfig.lineThickness
    for (let i = 0; i < puzzleConfig.width + 1; i++) {
        ctx.beginPath()
        ctx.moveTo(
            puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetX,
            puzzleState.offsetY
        )
        ctx.lineTo(
            puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetX,
            puzzleState.zoom * puzzleConfig.height * puzzleConfig.squareSize + puzzleState.offsetY
        )
        ctx.closePath()
        ctx.stroke()
    }

    for (let i = 0; i < puzzleConfig.height + 1; i++) {
        ctx.beginPath()
        ctx.moveTo(
            puzzleState.offsetX,
            puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetY
        )
        ctx.lineTo(
            puzzleState.zoom * puzzleConfig.width * puzzleConfig.squareSize + puzzleState.offsetX,
            puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetY
        )
        ctx.closePath()
        ctx.stroke()
    }

    //? draw number
    ctx.font = `${puzzleState.zoom * puzzleConfig.fontSize}px ${puzzleConfig.font}`
    const nonogramData = createNonogramData()
    for (let i = 0; i < nonogramData.column.length; i++) {
        ctx.beginPath()
        ctx.textAlign = "end"
        ctx.textBaseline = "middle"
        ctx.fillStyle = puzzleConfig.lineColor
        ctx.closePath()
        ctx.fillText(
            nonogramData.column[i].join(" "),
            puzzleState.offsetX - puzzleState.zoom * puzzleConfig.textPadding,
            puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetY + puzzleState.zoom * puzzleConfig.squareSize / 2
        )
    }

    for (let i = 0; i < nonogramData.row.length; i++) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.fillStyle = puzzleConfig.lineColor
        ctx.closePath()
        nonogramData.row[i].reverse()
        for (let j = 0; j < nonogramData.row[i].length; j++) {
            ctx.fillText(
                nonogramData.row[i][j].toString(),
                puzzleState.zoom * i * puzzleConfig.squareSize + puzzleState.offsetX + puzzleState.zoom * puzzleConfig.squareSize / 2,
                puzzleState.offsetY - puzzleState.zoom * j * 2 * puzzleConfig.fontSize - puzzleState.zoom * puzzleConfig.textPadding,
            )
        }
    }
}

function updateCell(ev: MouseEvent) {
    if (!puzzleState.isDrawing) return
    const coord = {
        x: Math.floor((ev.offsetX - puzzleState.offsetX) / puzzleConfig.squareSize / puzzleState.zoom),
        y: Math.floor((ev.offsetY - puzzleState.offsetY) / puzzleConfig.squareSize / puzzleState.zoom),
    }
    if (coord.x < 0 || coord.y < 0 || coord.x >= puzzleConfig.width || coord.y >= puzzleConfig.height) return
    if (alreadyDrawnData[coord.x][coord.y]) return

    puzzleData[coord.x][coord.y] = !puzzleData[coord.x][coord.y]
    alreadyDrawnData[coord.x][coord.y] = true
}

function moveGrid(ev: MouseEvent) {
    if (!puzzleState.isDragging) return
    const delta = {
        x: (ev.offsetX - puzzleState.previousMouseCoord.x),
        y: (ev.offsetY - puzzleState.previousMouseCoord.y),
    }

    puzzleState.offsetX += delta.x
    puzzleState.offsetY += delta.y

    puzzleState.previousMouseCoord.x = ev.offsetX
    puzzleState.previousMouseCoord.y = ev.offsetY
}

function centerPuzzle() {
    const center = {
        x: (innerWidth - puzzleState.zoom * puzzleConfig.width * puzzleConfig.squareSize) / 2,
        y: (innerHeight - puzzleState.zoom * puzzleConfig.height * puzzleConfig.squareSize) / 2,
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

        updatePuzzleConfig("width", width.toString())
        updatePuzzleConfig("height", height.toString())
        // widthInput.value = width.toString()
        // heightInput.value = height.toString()
        puzzleData = newPuzzleData
    } catch (e) {
        alert("Invalid input specified!")
    }
}

function exportPuzzleAsImg(withAnswer: boolean) {
    const prevState = {
        zoom: puzzleState.zoom,
        offsetX: puzzleState.offsetX,
        offsetY: puzzleState.offsetY,
        width: canvas.width,
        height: canvas.height,
    }
    const padding = 16

    puzzleState.zoom = 1

    const nonogramData = createNonogramData()

    //? set base width and height as the puzzle board
    let width = puzzleConfig.width * puzzleConfig.squareSize
    let height = puzzleConfig.height * puzzleConfig.squareSize

    //? calculate the extra width and height needed for the hint text
    let textRowLength = 0, textColLength = 0

    ctx.font = `${puzzleConfig.fontSize}px ${puzzleConfig.font}`
    for (let i = 0; i < nonogramData.column.length; i++) {
        const textMetric = ctx.measureText(nonogramData.column[i].join(" "))
        textRowLength = Math.max(textRowLength, textMetric.width)
    }

    for (let i = 0; i < nonogramData.row.length; i++) {
        textColLength = Math.max(textColLength, puzzleConfig.fontSize * 2 * nonogramData.row[i].length)
    }

    textColLength += puzzleConfig.textPadding
    textRowLength += puzzleConfig.textPadding

    puzzleState.offsetX = textRowLength + padding
    puzzleState.offsetY = textColLength + padding

    canvas.width = width + textRowLength + padding * 2
    canvas.height = height + textColLength + padding * 2

    drawBgCanvas()
    drawPuzzle(!withAnswer)

    const elm = document.createElement("a")
    elm.href = canvas.toDataURL()

    canvas.width = prevState.width
    canvas.height = prevState.height
    puzzleState.offsetX = prevState.offsetX
    puzzleState.offsetY = prevState.offsetY
    puzzleState.zoom = prevState.zoom
    drawPuzzle()

    elm.download = `nonogram-${withAnswer ? "solved" : "unsolved"}.png`
    elm.click()
    elm.remove()
}

// -----------------------------------

function init() {

    clearPuzzle()
    resizeCanvas()
    centerPuzzle()
    requestAnimationFrame(update)
}

function update() {
    drawBgCanvas()
    resizeGridData()
    drawPuzzle()
    requestAnimationFrame(update)
}

// -----------------------------------

exportButton.addEventListener("click", exportPuzzle)
exportAsPNG.addEventListener("click", () => exportPuzzleAsImg(true))
exportAsPNGUnsolved.addEventListener("click", () => exportPuzzleAsImg(false))
importButton.addEventListener("click", importPuzzle)

controlButton.addEventListener("click", () => {
    controlPanel.classList.toggle("off")
})

resetPosButton.addEventListener("click", centerPuzzle)
clearAllButton.addEventListener("click", clearPuzzle)

document.querySelectorAll(".puzzleConfig").forEach((v: HTMLInputElement) => {
    v.value = v.getAttribute("placeholder")
    v.addEventListener("input", validateInput(v.getAttribute("placeholder")))
    v.addEventListener("input", () => {
        switch (v.type) {
            case "number":
                puzzleConfig[v.name] = Number(v.value || v.getAttribute("placeholder"))
                break
            default:
                puzzleConfig[v.name] = v.value
        }
    })
})

canvas.addEventListener("contextmenu", e => e.preventDefault())

canvas.addEventListener("wheel", (e) => {
    const relative = () => ({
        x: (e.x - puzzleState.offsetX) / puzzleState.zoom,
        y: (e.y - puzzleState.offsetY) / puzzleState.zoom
    })

    const _old = relative()

    const delta = Math.sign(-e.deltaY)
    puzzleState.zoom *= Math.sqrt(Math.exp(delta * puzzleConfig.zoomSpeed))
    puzzleState.zoom = Math.max(puzzleState.zoom, 0.025)
    puzzleState.zoom = Math.min(puzzleState.zoom, 10)

    const _new = relative()
    puzzleState.offsetX += (_new.x - _old.x) * puzzleState.zoom
    puzzleState.offsetY += (_new.y - _old.y) * puzzleState.zoom
})

canvas.addEventListener("mousedown", (ev) => {
    if (puzzleState.isDrawing || puzzleState.isDragging) return
    switch (ev.button) {
        case 0:
            puzzleState.isDrawing = true
            alreadyDrawnData = Array.from({ length: puzzleConfig.width }, () => Array.from({ length: puzzleConfig.height }, () => false))
            updateCell(ev)
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
    updateCell(ev)
    moveGrid(ev)
})

addEventListener("DOMContentLoaded", init)
addEventListener("resize", resizeCanvas)