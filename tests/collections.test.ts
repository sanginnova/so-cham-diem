import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionRows, parseMoney, validateCollectionRecord } from '../src/lib/collections';
import { scopeBackup } from '../src/lib/scopedBackup';
const students: any[] = [{id:'s1',classId:'a',teacherId:'t',fullName:'Học sinh A'}, {id:'s2',classId:'a',teacherId:'t',fullName:'Học sinh B'}];
const collection: any = {id:'c1',teacherId:'t',classId:'a',studentId:'',kind:'collection',date:'2026-10-15',createdBy:'t',createdAt:'now',updatedAt:'now',data:{name:'Khoản kiểm tra',amount:'100000',status:'Đang thu',studentIds:'["s1","s2"]',studentNames:'{"s1":"Học sinh A","s2":"Học sinh B"}'}};
const payment = (id:string,amount:string, extra:any={}): any => ({...collection,id,studentId:'s1',kind:'payment',data:{collectionId:'c1',amount,method:'Tiền mặt',state:'Đã ghi nhận',note:'',...extra}});
const allowance = (amount:string,mode='Giảm'): any => ({...collection,id:'a1',studentId:'s1',kind:'allowance',data:{collectionId:'c1',amount,mode,reason:'Theo danh sách được duyệt'}});
test('money rejects negative, fractional, exponential, NaN and oversized values',()=>{
  for(const v of ['-1','1.5','1e5','NaN','Infinity','','1000000000000']) assert.throws(()=>parseMoney(v));
  assert.equal(parseMoney('0'),0); assert.equal(parseMoney('100000'),100000);
});
test('installments accumulate and canceled payments remain in history but not totals',()=>{
  const records=[collection,payment('p1','30000'),payment('p2','20000'),payment('p3','50000',{state:'Đã hủy',voidReason:'Ghi trùng'})];
  const row=collectionRows(collection,records,students)[0];
  assert.equal(row.paid,50000);assert.equal(row.remaining,50000);assert.equal(row.status,'Nộp một phần');assert.equal(row.transactions.length,3);
});
test('discount, full exemption and excluded students calculate actual obligations',()=>{
  assert.equal(collectionRows(collection,[allowance('25000')],students)[0].due,75000);
  assert.equal(collectionRows(collection,[allowance('100000','Miễn')],students)[0].status,'Miễn');
  assert.equal(collectionRows(collection,[allowance('100000','Không áp dụng')],students)[0].status,'Không áp dụng');
  assert.throws(()=>validateCollectionRecord(allowance('150000'),[collection],students),/lớn hơn/);
});
test('overpayments do not hide another student unpaid amount',()=>{
  const rows=collectionRows(collection,[payment('p1','120000')],students);
  assert.equal(rows[0].excess,20000);assert.equal(rows[0].status,'Nộp dư');
  assert.equal(rows.reduce((s,r)=>s+r.remaining,0),100000);
});
test('creation roster is stable when class membership changes',()=>{
  const rows=collectionRows(collection,[],[...students.slice(1),{id:'new',fullName:'New student'}] as any);
  assert.equal(rows.length,2);assert.equal(rows[0].name,'Học sinh A');assert.equal(rows.some(r=>r.studentId==='new'),false);
});
test('payment validation prevents foreign members, changes, closed-period entries and missing void reasons',()=>{
  const p=payment('p1','10000');
  assert.doesNotThrow(()=>validateCollectionRecord({...p,id:undefined},[collection],students));
  assert.throws(()=>validateCollectionRecord({...p,id:undefined,studentId:'other'},[collection],students),/không nằm/);
  assert.throws(()=>validateCollectionRecord({...p,data:{...p.data,amount:'20000'}},[collection,p],students),/chỉ được hủy/);
  assert.throws(()=>validateCollectionRecord({...p,data:{...p.data,state:'Đã hủy'}},[collection,p],students),/lý do/);
  assert.doesNotThrow(()=>validateCollectionRecord({...p,data:{...p.data,state:'Đã hủy',voidReason:'Ghi trùng'}},[collection,p],students));
  assert.throws(()=>validateCollectionRecord({...p,id:undefined},[{...collection,data:{...collection.data,status:'Đã kết thúc'}}],students),/kết thúc/);
});
test('backup remaps collections, membership, payment links and name snapshots consistently',()=>{
  const fixture:any={students,disciplineLogs:[],homeroomRecords:[collection,payment('p1','30000'),allowance('10000')],classConfig:{id:'a'}};
  const target:any={id:'b',teacherId:'other',scopeVersion:2};
  const imported=scopeBackup(fixture,'other','other',target);
  const parent=imported.homeroomRecords[0];
  assert.equal(JSON.parse(parent.data.studentIds)[0],imported.students[0].id);
  assert.equal(imported.homeroomRecords[1].data.collectionId,parent.id);
  assert.equal(imported.homeroomRecords[2].data.collectionId,parent.id);
  assert.deepEqual(scopeBackup(imported,'other','other',imported.classConfig),imported);
  assert.equal(collectionRows(parent,imported.homeroomRecords,imported.students)[0].remaining,60000);
  assert.throws(()=>scopeBackup({...fixture,homeroomRecords:[payment('p1','1')]},'other','other',target),/không có/);
});
