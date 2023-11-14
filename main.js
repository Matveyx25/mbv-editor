const input = document.querySelector('[data-file-input]');
const canvas = document.querySelector('[data-image-canvas]');
const zoomCanvas = document.querySelector('[data-zoom-canvas]');
const output = document.querySelector('[data-file-output]');
const shifts = document.getElementById('shift-form');
const zoomForm = document.getElementById('zoom-form');
const cursor = document.getElementById('cursor-form');
const scroller = document.querySelector('.canvas-wrapper');
const ctx = canvas.getContext("2d");
const zoomCtx = zoomCanvas.getContext("2d");

// Глобальное состояние
let state = {
  shift: 0,
  imageData: null,
  pictureParams: null,
  pictureData: null,
  editedData: null,
	zoomCoefficient: 10,
	overviewCoefficient: 125,
};

// Обработчик события изменения сдвига
shifts.addEventListener("change", handleShiftChange, false);

// Обработчик события изменения выбора файла
input.onchange = handleInputChange;

// Функция для выбора координат пикселя
function getCursorInfo(event, bounding) {
  const { pictureParams, pictureData } = state;

	let x, y;

	x = event.offsetX || event.layerX || 0;
	y = event.offsetY || event.layerY || 0;
  
	cursor.x.value = x
  cursor.y.value = y

	let brightness = pictureData[y][x]

	cursor.brightness.value = brightness

	fillZoomCanvas(x, y)
}

zoomForm.addEventListener("change", handleZoomChange, false);

function handleZoomChange(event) {
 const { imageData, editedData, zoomCoefficient } = state;
 event.preventDefault();
 state.zoomCoefficient = +zoomForm.zoom.value;
 if (state?.imageData) {
   const zoomedData = getZoomedData(state.zoomCoefficient);
   const imageData = createZoomImageData(zoomedData.length, zoomedData[0].length);
   populateImageData(imageData, zoomedData);
   displayZoomImageData(imageData);
 }
}

// Функция для обработки изменения сдвига
function handleShiftChange(event) {
const { imageData, editedData } = state; 

  event.preventDefault();
  state.shift = +shifts.shift.value;

  if (state?.imageData) {
    modifyPictureData();
    populateImageData(imageData, editedData);
    displayImageData();
  }
}

// Функция для обработки выбора файла
async function handleInputChange() {
  const fileDataBuffer = await input.files[0].arrayBuffer();
  output.innerHTML = 'Имя файла: ' + input.files[0].name;

  state.pictureParams = extractPictureParams(fileDataBuffer);
  state.pictureData = extractPictureData(fileDataBuffer, 4, state.pictureParams[0], state.pictureParams[1]);
  state.editedData = [ ...state.pictureData ];
  state.imageData = createImageData(state.pictureParams[0], state.pictureParams[1]);

  modifyPictureData();
  populateImageData(state.imageData, state.editedData);
  displayImageData();

  const bounding = canvas.getBoundingClientRect();
	
  canvas.addEventListener("mousemove", (e) => getCursorInfo(e, bounding), false);
}

// Функция для извлечения параметров изображения
function extractPictureParams(fileDataBuffer) {
  return new Uint16Array(fileDataBuffer, 0, 2);
}

// Функция для извлечения данных изображения
function extractPictureData(fileDataBuffer, byteOffset, width , height) {
	const result = [];
	for (let i = 0; i < height; i++) {
			result.push(new Uint16Array(fileDataBuffer, byteOffset, width));
			byteOffset += width*2;
	}
	return result
}

// Функция для изменения данных изображения
function modifyPictureData() {
  const { pictureData, shift } = state;
	let newData = []

	for (let i = 0; i < pictureData.length; i++) {
		newData.push([]);
			for (let j = 0; j < pictureData[i].length; j++) {
				newData[i][j] = (pictureData[i][j] >> shift) & 0xFF;
			}
	}

	state.editedData = newData
}

// Функция для установки размеров холста
function setCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
}

// Функция для создания объекта ImageData
function createImageData(width, height) {
  setCanvasSize(width, height);
  return ctx.createImageData(width, height);
}

// Функция для установки размеров холста
function setZoomCanvasSize(width, height) {
  zoomCanvas.width = width;
  zoomCanvas.height = height;
}

// Функция для создания объекта ImageData
function createZoomImageData(width, height) {
  setZoomCanvasSize(width, height);
  return zoomCtx.createImageData(width, height);
}

// Функция для заполнения объекта ImageData
function populateImageData(imageData, data) { 
  let dataIndex = 0;
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      const colorValue = data[i][j];
      imageData.data[dataIndex + 0] = colorValue; // R value
      imageData.data[dataIndex + 1] = colorValue; // G value
      imageData.data[dataIndex + 2] = colorValue; // B value
      imageData.data[dataIndex + 3] = 255; // A value
      dataIndex += 4;
    }
  }
} 

// Функция для отображения объекта ImageData на холсте
function displayImageData() {
  const { imageData } = state;
	
  ctx.putImageData(imageData, 0, 0);
}

function displayZoomImageData(imageData) {
  zoomCtx.putImageData(imageData, 0, 0);
}

function fillZoomCanvas(x, y) {
  const { zoomCoefficient, editedData, pictureParams } = state;
  const startX = Math.round(x - zoomCoefficient / 2);
  const startY = Math.round(y - zoomCoefficient / 2);
  let currentX = startX;
  let currentY = startY;
  let minValue = 255;
  let maxValue = 0;
  const pixelValues = [];
  for (let i = 0; i < zoomCoefficient * zoomCoefficient; i++) {
    const pixelValue = editedData[currentY][currentX];
    pixelValues.push(pixelValue);
    minValue = Math.min(minValue, pixelValue);
    maxValue = Math.max(maxValue, pixelValue);
    currentX++;
    if (currentX >= startX + zoomCoefficient) {
      currentX = startX;
      currentY++;
    }
  }
	const interpolationUnitSize = 2 * zoomCoefficient - 1 // размер фрагмента 2х2 пиксела после интерполяции
	const size = parseInt((pictureParams[0] - 1)/(interpolationUnitSize - 1)) + 1
  const {zoomedData, zoomedSize} = bilinearInterpolation(startX, startY, size, zoomCoefficient, editedData);
  const normalizedData = normalizeColor(zoomedData);
	const imageData = createZoomImageData(zoomedSize, zoomedSize);
  populateImageData(imageData, normalizedData);
  displayZoomImageData(imageData);
}

// Function for bilinear interpolation
function bilinearInterpolation(left, top, size, zoomCoefficient, data) {
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  const interpolationUnitSize = 2 * zoomCoefficient - 1;
  const zoomedSize = (interpolationUnitSize - 1) * (size - 1) + 1;
  const zoomedData = [];
  for (let j = 0; j < zoomedSize; j++) {
    zoomedData.push([]);
  }
  let rowIndex = 0;
  for (let i = top; i < top + size - 1; i++) {
    let columnIndex = 0;
    for (let j = left; j < left + size - 1; j++) {
      const tl = data[i][j]; 
      const tr = data[i][j + 1];
      const bl = data[i + 1][j];
      const br = data[i + 1][j + 1];
      for (let n = rowIndex; n < rowIndex + interpolationUnitSize; n++) {
        const y = (n - rowIndex) / (interpolationUnitSize - 1);
        for (let m = columnIndex; m < columnIndex + interpolationUnitSize; m++) {
          const x = (m - columnIndex) / (interpolationUnitSize - 1);
          const brightness = tl * (1 - x) * (1 - y) + tr * x * (1 - y) + bl * (1 - x) * y + br * x * y;
          zoomedData[n][m] = Math.round(brightness);
        }
      }
      columnIndex += interpolationUnitSize - 1;
    }
    rowIndex += interpolationUnitSize - 1;
  }
  return { zoomedData, zoomedSize };
}

// Function for color normalization
function normalizeColor(data) {
	const maxBrightness = Math.max.apply(null, data.map((x)=>Math.max.apply(null, x)));
	const minBrightness =  Math.min.apply(null, data.map((x)=>Math.min.apply(null, x)));
	const delta = maxBrightness - minBrightness
	const normalizedUnit = delta/0xFF
	const normalizedData = data.map((row) =>
		row.map((brightness) => ((brightness - minBrightness) * normalizedUnit))
	);
	return normalizedData;
}

function getZoomedData(zoomLevel) {
	const { editedData } = state;
	const zoomedData = [];
	for (let i = 0; i < editedData.length; i += zoomLevel) {
		zoomedData.push([]);
		for (let j = 0; j < editedData[i].length; j += zoomLevel) {
			zoomedData[i / zoomLevel][j / zoomLevel] = editedData[i][j];
		}
	}
	return zoomedData;
 }
 