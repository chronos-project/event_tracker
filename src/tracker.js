// window.axios = require('axios');

const createQueue = require('./queue');
const queue = createQueue(50);

const getEventData = (eType, e) => {
  const timestamp = Date.now(); // NEEDS TO REFLECT CLIENT TIME -- must fix

  switch (eType) {
    case 'link_clicks':
      return {
        eType,
        linkText: e.target.firstChild.textContent,
        targetURL: e.target.href,
        timestamp,
      };
      break;
    case 'clicks':
      return {
        eType,
        target_node: e.target.nodeName,
        buttons: e.buttons,
        x: e.clientX,
        y: e.clientY,
        timestamp,
      }
    case 'mouse_moves':
      return {
        eType,
        x: e.x,
        y: e.y,
        timestamp,
      };
    case 'key_press':
      return {
        eType,
        key: e.key,
        timestamp,
      }
    case 'form_submission':
      const inputs = [...e.target.elements].filter(e => e.tagName === 'INPUT');
      const data = {
        eType,
      };

      inputs.forEach(input => data[input.name] = input.value);

      return data;
    case 'pageview': {
      return {
        eType,
        url: window.location.href,
        title: document.title,
        timestamp,
      }
    }
    default:
      return {};
  }
}

const formatToJSON = (eType, e) => {
  return JSON.stringify(getEventData(eType, e));
}

const addToQueue = (eType, e) => {
  queue.add(formatToJSON(eType, e));
}

document.addEventListener('DOMContentLoaded', function(event) {
  let mousePos;
  let prevMousePos;

  (() => {
    addToQueue('pageview');
  })();

  document.addEventListener('click', function(event) {
    if (event.target.tagName === 'A') {
      addToQueue('link_clicks', event);
      queue.flush();
    }

    addToQueue('clicks', event);
  });

  document.addEventListener('mousemove', (event) => {
    mousePos = {
      x: event.clientX,
      y: event.clientY,
    }
  });

  document.addEventListener('keypress', (event) => {
    addToQueue('key_press', event);
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();

    addToQueue('form_submission', event);
    queue.flush();
    event.target.submit();
  })

  setInterval(() => {
    const pos = mousePos;

    if (pos) {
      if (!prevMousePos || prevMousePos && pos !== prevMousePos) {

        addToQueue('mouse_moves', pos);

        prevMousePos = pos;
      }
    }
  }, 100);
});
