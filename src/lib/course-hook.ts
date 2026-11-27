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
 * 3. Tells the app about each failed final check. Every Lottie course shows a
 *    "Try again" button (id="again") under "You got X of Y" when the final
 *    check is not passed; the script spots it and sends "stratlearn:try" with
 *    that score, so managers can see how many tries a course took.
 * 4. Hands the end of the course to the app. The course's own pearl and
 *    certificate page (renderBadge) is replaced: its "Get my pearl and
 *    certificate" button sends "stratlearn:finished", and the player shows the
 *    app's finish screen (back to My courses, certificate, share).
 * 5. Hands "Ask a trainer" to the app. Some courses have their own
 *    "Ask a trainer" button (id="askT"); when the course needs a trainer, a tap
 *    sends "stratlearn:ask" and the app opens its own question box, which
 *    reaches the team's real trainer.
 */
export function courseHook(opts: {
  learnerId: string;
  slug: string;
  courseVersion: number;
  completed: boolean;
  /**
   * Retraining round. When a course comes back for retraining (or a manager
   * asks for a retake), saves go under a fresh name, so last time's "passed"
   * can't count as this time's finish. Empty for a first attempt and for
   * reviewing a finished course.
   */
  round?: string;
  /** This course has Ask a trainer (src/lib/trainer.ts). */
  ask?: boolean;
}) {
  const prefix = `sl:${opts.learnerId}:${opts.slug}:v${opts.courseVersion}:${opts.round ? `r${opts.round}:` : ""}`;
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
if(!DONE&&window.MutationObserver){var seen=[];new MutationObserver(function(){
  var b=document.getElementById("again");if(!b||seen.indexOf(b)>=0)return;seen.push(b);
  var w=b.closest(".band"),q=w&&w.querySelector(".sub"),t=q?q.textContent||"":"",m=t.match(/(\\d+)\\D+?(\\d+)/),sc;
  if(m&&+m[2]>0)sc=Math.round(+m[1]/+m[2]*100);
  try{window.parent.postMessage({type:"stratlearn:try",score:sc,lang:window.LOTTIE_LANG||"en"},location.origin)}catch(e){}
}).observe(document.documentElement,{childList:true,subtree:true})}
if(${opts.ask ? "true" : "false"})document.addEventListener("click",function(e){var t=e.target;
  if(!t||!t.closest||!t.closest("#askT"))return;e.preventDefault();e.stopPropagation();
  try{window.parent.postMessage({type:"stratlearn:ask"},location.origin)}catch(x){}},true);
function finished(){try{window.parent.postMessage({type:"stratlearn:finished"},location.origin)}catch(e){}}
function takeEnd(){if(typeof window.renderBadge==="function"&&window.renderBadge!==finished){try{window.renderBadge=finished}catch(e){}}}
document.addEventListener("DOMContentLoaded",takeEnd);window.addEventListener("load",takeEnd);
if(!DONE){try{for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf(P)===0){var o=parse(g.call(ls,k));
  if(o&&o.passed===true){var st=o;setTimeout(function(){report(st)},1500);break}}}}catch(e){}}
})();`;
  return `<script id="stratlearn-hook">${js}</script>\n`;
}
