import test from 'node:test'
import assert from 'node:assert/strict'
import { animateSectionChange } from '../../src/features/flowtree/useSectionTransition.js'
function fixture({mobile=true,reduced=false}={}) {
  const calls=[];let cancelled=0
  return { calls, cancelled:()=>cancelled, root:{querySelectorAll:()=>[{animate:(frames,options)=>{calls.push({frames,options});return {cancel:()=>cancelled++}}}]}, host:{matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:mobile})} }
}
test('next and previous sections enter from opposite sides and clean up',()=>{
  const f=fixture()
  const stop=animateSectionChange(f.root,'loans','goals',f.host)
  assert.equal(f.calls[0].frames[0].transform,'translateX(64px)')
  assert.equal(f.calls[0].options.duration,280)
  stop();assert.equal(f.cancelled(),1)
  animateSectionChange(f.root,'goals','loans',f.host)
  assert.equal(f.calls[1].frames[0].transform,'translateX(-64px)')
})
test('initial render, desktop and reduced motion do not animate',()=>{
  for(const options of [{mobile:false},{reduced:true},{}]) {
    const f=fixture(options)
    animateSectionChange(f.root,'home',Object.keys(options).length?'loans':'home',f.host)()
    assert.equal(f.calls.length,0)
  }
})
