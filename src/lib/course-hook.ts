import "server-only";

/**
 * A small script put at the top of every Lottie course file when the app
 * serves it. It does two jobs:
 *
 * 1. Gives each learner their own saved progress. Lottie courses save progress
 *    in the browser, so on a shared tablet the next person would see the last
 *    person's progress. The script files each learner's saves under their own
 *    name (and the course version).
 * 2. Tells the app when the learner passes the final check. The course marks
 *    itself passed in its saved progress; when that flips from "not passed" to
 *    "passed", the script sends "stratlearn:complete" with the score to the
 *    player around it, which records the completion, certificate and badge.
 *    If a pass was saved but never reached the app (signal lost), it is sent
 *    again the next time the course opens.
 */
export function courseHook(opts: { learnerId: string; slug: string; courseVersion: number; completed: boolean }) {
  const prefix = `sl:${opts.learnerId}:${opts.slug}:v${opts.courseVersion}:`;
  const js = `(function(){
var P=${JSON.stringify(prefix)},DONE=${opts.completed ? "true" : "false"},sent=false;
var proto=Storage.prototype,g=proto.getItem,s=proto.setItem,r=proto.removeItem,ls=null;
try{ls=window.localStorage}catch(e){}
if(!ls)return;
function mine(st){return st===ls}
function report(st){if(sent||DONE)return;sent=true;var f=st&&st.final||{};
  var score=f.qs?Math.round(f.first/f.qs*100):undefined;
  try{window.parent.postMessage({type:"stratlearn:complete",score:score,lang:window.LOTTIE_LANG||"en"},location.origin)}catch(e){}}
function parse(v){try{var o=JSON.parse(v);return o&&typeof o==="object"?o:null}catch(e){return null}}
proto.getItem=function(k){return g.call(this,mine(this)?P+k:k)};
proto.removeItem=function(k){return r.call(this,mine(this)?P+k:k)};
proto.setItem=function(k,v){
  if(mine(this)&&!sent){var n=parse(v);if(n&&n.passed===true){var o=parse(g.call(this,P+k));if(!(o&&o.passed===true))report(n)}}
  return s.call(this,mine(this)?P+k:k,v)};
if(!DONE){try{for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf(P)===0){var o=parse(g.call(ls,k));
  if(o&&o.passed===true){var st=o;setTimeout(function(){report(st)},1500);break}}}}catch(e){}}
})();`;
  return `<script id="stratlearn-hook">${js}</script>\n`;
}
