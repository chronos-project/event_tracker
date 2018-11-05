// window.axios = require('axios');

// this snippet was found on SO and is exactly the same as used in Keen's tracker
// for Node and older browsers. i'm assuming it is fine to use CnP, then. Just updated it
// to use ES6
let uuidv4;

const getUserAgent = (usrAgentString) => {
  let sBrowser = 'unknown';
  let sUsrAg = usrAgentString;

  //The order matters here, and this may report false positives for unlisted browsers.

  if (sUsrAg.indexOf("Firefox") > -1) {
       sBrowser = "Mozilla Firefox";
       //"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:61.0) Gecko/20100101 Firefox/61.0"
  } else if (sUsrAg.indexOf("Opera") > -1) {
       sBrowser = "Opera";
  } else if (sUsrAg.indexOf("Trident") > -1) {
       sBrowser = "Microsoft Internet Explorer";
       //"Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; Zoom 3.6.0; wbx 1.0.0; rv:11.0) like Gecko"
  } else if (sUsrAg.indexOf("Edge") > -1) {
       sBrowser = "Microsoft Edge";
       //"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299"
  } else if (sUsrAg.indexOf("Chrome") > -1) {
      sBrowser = "Google Chrome or Chromium";
      //"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/66.0.3359.181 Chrome/66.0.3359.181 Safari/537.36"
  } else if (sUsrAg.indexOf("Safari") > -1) {
      sBrowser = "Apple Safari";
      //"Mozilla/5.0 (iPhone; CPU iPhone OS 11_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1 980x1306"
  }

  return sBrowser;
}

const getEventData = (eType, target, e) => {
  const timestamp = Date.now();

  switch (eType) {
    case 'link_click':
      return {
        eType,
        linkText: target.firstChild.textContent,
        targetURL: target.href,
        timestamp,
      };
      break;
    case 'click':
      return {
        eType,
        target_node: target.nodeName,
        buttons: e.buttons,
        x: e.clientX,
        y: e.clientY,
        timestamp,
      }
    case 'mouse_move':
      return e.map(pos => {
        return {
          eType,
          x: pos.x,
          y: pos.y,
          timestamp,
        }
      })
    case 'key_press':
      return {
        eType,
        key: e.key,
        timestamp,
      }
    case 'form_submission':
      const data = {
        eType,
      };
      e.forEach(input => data[input.name] = input.value);

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

const appendMetadataToEvent = (eType, target, e) => {
  const eventAttrs = getEventData(eType, target, e);

  return {
    eventAttrs,
    metadata: {
      url: window.location.href,
      userAgent: getUserAgent(navigator.userAgent),
      pageTitle: document.title,
      cookieAllowed: navigator.cookieEnabled,
      language: navigator.language,
      uuid: uuidv4,
    }
  }
};

const API_URL = 'http://localhost:3000/api/events';

document.addEventListener('DOMContentLoaded', function(event) {
  let mousePos;
  let prevMousePos;

  (() => {
    const json = JSON.stringify(appendMetadataToEvent('pageview'));
    const status = navigator.sendBeacon('http://localhost:3000/api/events', json);
  })();

  if (!window.sessionStorage.getItem('uuid')) {
    const generateUuidv4 = (() => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    })();

    window.sessionStorage.setItem('uuid', generateUuidv4);
  }

  uuidv4 = window.sessionStorage.getItem('uuid');

  const Buffer = {
    buffer: [],
    size: 0,
    max: 50,

    add (event) {
      this.buffer.push(event);
      this.size += 1;
      this.checkMax();
    },

    checkMax () {
      if (this.size >= this.max) {
        console.log('flushing!');
        this.flush();
      }
    },

    flush () {
      const json = JSON.stringify(appendMetadataToEvent('mouse_move', '', this.buffer));

      this.clear();
      navigator.sendBeacon(`${API_URL}/mousemoves`, json);
    },

    clear () {
      this.buffer = [];
      this.size = 0;
    }
  }

  document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.tagName === 'A') {
      const json = JSON.stringify(appendMetadataToEvent('link_click', target));
      const status = navigator.sendBeacon('http://localhost:3000/api/events', json);
    }

    // const json = JSON.stringify(appendMetadataToEvent('click', target, event));
    // navigator.sendBeacon(API_URL, json);
  });

  document.addEventListener('mousemove', (event) => {
    mousePos = {
      x: event.clientX,
      y: event.clientY,
    }
  });

  // document.addEventListener('keypress', (event) => {
  //   const json = JSON.stringify(appendMetadataToEvent('key_press', '', event));
  //
  //   navigator.sendBeacon(API_URL, json);
  // })
  //
  // document.addEventListener('submit', (event) => {
  //   event.preventDefault();
  //
  //   const inputs = [...event.target.elements].filter(e => e.tagName === 'INPUT');
  //   const json = JSON.stringify(appendMetadataToEvent('form_submission', '', inputs));
  //
  //   navigator.sendBeacon(API_URL, json);
  // })

  setInterval(() => {
    const pos = mousePos;

    if (pos) {
      if (!prevMousePos || prevMousePos && pos !== prevMousePos) {
        Buffer.add(pos);

        prevMousePos = pos;
      }
    }
  }, 100);
});
