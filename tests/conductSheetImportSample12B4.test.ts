import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  parseConductWorkbook,
  extractWeekAndMonth,
  parseViolationItems,
  parseBonusItems,
} from '../src/lib/conductSheetImporter';
import { SAMPLE_12B4_CONDUCT_DATA } from '../src/data/sample12B4ConductData';
import fs from 'node:fs';

test('extractWeekAndMonth detects sheet name correctly', () => {
  const t1 = extractWeekAndMonth('T1-T10');
  assert.equal(t1.weekNumber, 1);
  assert.equal(t1.month, 10);

  const t2 = extractWeekAndMonth('T2-T10 ');
  assert.equal(t2.weekNumber, 2);
  assert.equal(t2.month, 10);

  const t3 = extractWeekAndMonth('T3-T10', 'Tuần 3/ Tháng 10');
  assert.equal(t3.weekNumber, 3);
  assert.equal(t3.month, 10);
});

test('parseViolationItems extracts multiple items and negative score', () => {
  const text1 = 'ngủ trong giờ (-3đ); Đi học muộn 2 lần';
  const items1 = parseViolationItems(text1);
  assert.equal(items1.length, 2);
  assert.equal(items1[0].cleanName, 'ngủ trong giờ');
  assert.equal(items1[0].score, 3);
  assert.equal(items1[1].cleanName, 'Đi học muộn 2 lần');
  assert.equal(items1[1].count, 2);

  const text2 = 'Trốn chào cờ; không làm bài tập vật lí.';
  const items2 = parseViolationItems(text2);
  assert.equal(items2.length, 2);
  assert.equal(items2[0].cleanName, 'Trốn chào cờ');
  assert.equal(items2[1].cleanName, 'không làm bài tập vật lí.');
});

test('parseBonusItems extracts bonus score and honors', () => {
  const text = 'đi học đầy đủ (+2 đ); 10 điểm địa; Tổ trưởng hoàn thành tốt nhiệm vụ';
  const items = parseBonusItems(text);
  assert.equal(items.length, 3);
  assert.equal(items[0].cleanName, 'đi học đầy đủ');
  assert.equal(items[0].score, 2);
  assert.equal(items[1].cleanName, '10 điểm địa');
  assert.equal(items[1].score, 2);
});

test('sample 12B4 conduct data contains 3 weeks and 40 students each', () => {
  assert.equal(SAMPLE_12B4_CONDUCT_DATA.length, 3);
  assert.equal(SAMPLE_12B4_CONDUCT_DATA[0].students.length, 40);
  assert.equal(SAMPLE_12B4_CONDUCT_DATA[1].students.length, 40);
  assert.equal(SAMPLE_12B4_CONDUCT_DATA[2].students.length, 40);

  // Check specific student names from 12B4
  const s1 = SAMPLE_12B4_CONDUCT_DATA[0].students[0];
  assert.equal(s1.name, 'Nguyễn Quang Anh');
  const s40 = SAMPLE_12B4_CONDUCT_DATA[0].students[39];
  assert.equal(s40.name, 'Nhâm Hoàng Việt');
});

test('parse real excel file D:\\TOAN\\CĐN01\\12B4\\12B4- Chấm điểm rèn luyện tháng 10.xlsx if exists', () => {
  const samplePath = 'D:\\TOAN\\CĐN01\\12B4\\12B4- Chấm điểm rèn luyện tháng 10.xlsx';
  if (fs.existsSync(samplePath)) {
    const buf = fs.readFileSync(samplePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheets = parseConductWorkbook(wb, []);
    assert.equal(sheets.length, 3);
    assert.equal(sheets[0].className, '12B4');
    assert.equal(sheets[0].students.length, 40);
  }
});
