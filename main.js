const input = document.querySelector('[data-file-input]');
const canvas = document.querySelector('[data-image-canvas]');
const output = document.querySelector('[data-file-output]');
const shifts = document.getElementById('shift-form');
const cursor = document.getElementById('cursor-form');
const scroller = document.querySelector('.canvas-wrapper');
const ctx = canvas.getContext("2d");

// Глобальное состояние
let state = {
  shift: 0,
  imageData: null,
  pictureParams: null,
  pictureData: null,
  editedData: null
};

// Обработчик события изменения сдвига
shifts.addEventListener("change", handleShiftChange, false);

// Обработчик события изменения выбора файла
input.onchange = handleInputChange;

// Функция для выбора координат пикселя
function getCursorInfo(event, bounding) {
  const { pictureParams } = state;

	// Записываем значения x и y для опеделени позиции курсора на экране с учетом скролла и размера окна
  const x = ((event.clientX - bounding.left) * (pictureParams[0] / scroller.clientWidth)).toFixed(0);
  const y = Math.round((event.clientY - bounding.top - 0.5 + scroller.scrollTop) * (3000 / (scroller.scrollHeight - scroller.clientHeight)));
  
	cursor.x.value = x
  cursor.y.value = y

	let brightness = parseInt(
    state.editedData[y * pictureParams[1] + (pictureParams[0] - x)]
      .toString(2) 
      .padStart(16, "0") 
      .substring(8 - state.shift, 16 - state.shift), // Избавляемся от незначащих цифр с учётом сдвига
  )

	cursor.brightness.value = brightness
}

// Функция для обработки изменения сдвига
function handleShiftChange(event) {
  event.preventDefault();
  state.shift = +shifts.shift.value;

  if (state?.imageData) {
    modifyPictureData();
    populateImageData();
    displayImageData();
  }
}

// Функция для обработки выбора файла
async function handleInputChange() {
  const fileDataBuffer = await input.files[0].arrayBuffer();
  output.innerHTML = 'Имя файла: ' + input.files[0].name;

  state.pictureParams = extractPictureParams(fileDataBuffer);
  state.pictureData = extractPictureData(fileDataBuffer);
  state.editedData = { ...state.pictureData };
  state.imageData = createImageData(state.pictureParams[0], state.pictureParams[1]);

  modifyPictureData();
  populateImageData();
  displayImageData();

  const bounding = canvas.getBoundingClientRect();
	
  canvas.addEventListener("mousemove", (e) => getCursorInfo(e, bounding), false);
}

// Функция для извлечения параметров изображения
function extractPictureParams(fileDataBuffer) {
  return new Uint16Array(fileDataBuffer, 0, 2);
}

// Функция для извлечения данных изображения
function extractPictureData(fileDataBuffer) {
  return new Uint16Array(fileDataBuffer, 4);
}

// Функция для изменения данных изображения
function modifyPictureData() {
  const { editedData, pictureData, shift } = state;

  for (let i = 0; i < pictureData.length; i++) {
    editedData[i] = (pictureData[i] >> shift) & 255;
  }
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

// Функция для заполнения объекта ImageData
function populateImageData() { 
  const { imageData, editedData } = state; 

  for (let i = 0; i < state.imageData.data.length; i += 4) { 
    const picDataIndex = parseInt(i / 4); 
    const colorValue = editedData[picDataIndex]; 
    imageData.data.set([colorValue, colorValue, colorValue, 255], i); 
  } 
} 

// Функция для отображения объекта ImageData на холсте
function displayImageData() {
  const { imageData } = state;
	
  ctx.putImageData(imageData, 0, 0);
}