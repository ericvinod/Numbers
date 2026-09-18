// Speech helper — uses the browser's built-in text-to-speech (no audio files needed).
const Speech = (function(){
  const supported = 'speechSynthesis' in window;
  let preferredVoice = null;

  function pickVoice(){
    if(!supported) return;
    const voices = window.speechSynthesis.getVoices();
    if(!voices.length) return;
    // Prefer a friendly English voice if available
    preferredVoice =
      voices.find(v => /en-US|en_GB|en-GB/i.test(v.lang) && /female|child|samantha|zira|karen/i.test(v.name)) ||
      voices.find(v => /^en/i.test(v.lang)) ||
      voices[0];
  }

  if(supported){
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text, opts){
    opts = opts || {};
    if(!supported){
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = opts.rate || 0.85;
    utter.pitch = opts.pitch || 1.05;
    if(preferredVoice) utter.voice = preferredVoice;
    if(opts.onend) utter.onend = opts.onend;
    window.speechSynthesis.speak(utter);
  }

  function speakSequence(words, opts){
    opts = opts || {};
    if(!supported) return;
    window.speechSynthesis.cancel();
    let i = 0;
    function next(){
      if(i >= words.length){ if(opts.onend) opts.onend(); return; }
      speak(words[i], { rate: opts.rate, pitch: opts.pitch, onend: next });
      i++;
    }
    next();
  }

  return { speak, speakSequence, isSupported: () => supported };
})();
