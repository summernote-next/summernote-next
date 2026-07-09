import $$ from './dom-query.js';

/* @param {File} @return {Promise} */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target.result;
      resolve(dataURL);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

/* @param {String} @return {Promise} */
export function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');

    const cleanup = () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      img.removeEventListener('abort', onError);
    };

    const onLoad = () => {
      cleanup();
      resolve($$(img));
    };

    const onError = () => {
      cleanup();
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
      reject($$(img));
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.addEventListener('abort', onError);

    img.style.display = 'none';
    img.src = url;
  });
}