/**
 * Unit tests for the SM-2 spaced repetition algorithm in src/lib/storage.ts
 *
 * The SM-2 algorithm (Wozniak, 1987) schedules flashcard review intervals
 * based on a learner's performance grade (0–5). These tests verify the
 * mathematical behaviour described in the original paper.
 */

import { describe, it, expect } from 'vitest';
import { sm2Update, sm2NewCard } from '../lib/storage';

// ─── sm2NewCard ───────────────────────────────────────────────────────────────

describe('sm2NewCard', () => {
  it('creates a card with correct initial values', () => {
    const card = sm2NewCard('topic-1', 0, 'What is photosynthesis?', 'Converting light to energy');
    expect(card.id).toBe('topic-1::0');
    expect(card.topicId).toBe('topic-1');
    expect(card.question).toBe('What is photosynthesis?');
    expect(card.answer).toBe('Converting light to energy');
    expect(card.easeFactor).toBe(2.5);
    expect(card.interval).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.lastReviewed).toBeNull();
  });

  it('sets dueDate to today', () => {
    const today = new Date().toISOString().split('T')[0];
    const card = sm2NewCard('t', 0, 'Q', 'A');
    expect(card.dueDate).toBe(today);
  });

  it('builds unique IDs from topicId + cardIndex', () => {
    const a = sm2NewCard('topic-A', 0, 'Q', 'A');
    const b = sm2NewCard('topic-A', 1, 'Q', 'A');
    const c = sm2NewCard('topic-B', 0, 'Q', 'A');
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe(c.id);
  });
});

// ─── sm2Update — correct answers (grade >= 3) ─────────────────────────────────

describe('sm2Update — correct answers', () => {
  const freshCard = sm2NewCard('t', 0, 'Q', 'A');

  it('first correct answer sets interval to 1 day', () => {
    const updated = sm2Update(freshCard, 4);
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(1);
  });

  it('second correct answer sets interval to 6 days', () => {
    const after1 = sm2Update(freshCard, 4);
    const after2 = sm2Update(after1, 4);
    expect(after2.interval).toBe(6);
    expect(after2.repetitions).toBe(2);
  });

  it('third correct answer multiplies interval by easeFactor', () => {
    const after1 = sm2Update(freshCard, 4);
    const after2 = sm2Update(after1, 4);
    const after3 = sm2Update(after2, 4);
    // interval = round(6 * 2.5) = 15
    expect(after3.interval).toBe(15);
    expect(after3.repetitions).toBe(3);
  });

  it('easeFactor increases with perfect grade (5)', () => {
    const updated = sm2Update(freshCard, 5);
    expect(updated.easeFactor).toBeGreaterThan(2.5);
  });

  it('easeFactor decreases slightly with grade 3', () => {
    const updated = sm2Update(freshCard, 3);
    expect(updated.easeFactor).toBeLessThan(2.5);
  });

  it('easeFactor is never below 1.3 (SM-2 minimum)', () => {
    let card = sm2NewCard('t', 0, 'Q', 'A');
    // Grade 3 repeatedly to drive EF down
    for (let i = 0; i < 30; i++) {
      card = sm2Update(card, 3);
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('sets lastReviewed to today', () => {
    const today = new Date().toISOString().split('T')[0];
    const updated = sm2Update(freshCard, 4);
    expect(updated.lastReviewed).toBe(today);
  });

  it('schedules dueDate in the future', () => {
    const today = new Date().toISOString().split('T')[0];
    const updated = sm2Update(freshCard, 4);
    // ISO date strings sort lexicographically the same as chronologically
    expect(updated.dueDate >= today).toBe(true);
  });
});

// ─── sm2Update — incorrect answers (grade < 3) ────────────────────────────────

describe('sm2Update — incorrect answers', () => {
  it('resets repetitions to 0 on failure', () => {
    const card = sm2NewCard('t', 0, 'Q', 'A');
    const after1 = sm2Update(card, 4);   // correct
    const after2 = sm2Update(after1, 4); // correct — repetitions = 2
    const failed = sm2Update(after2, 1); // fail
    expect(failed.repetitions).toBe(0);
  });

  it('resets interval to 1 on failure', () => {
    const card = sm2NewCard('t', 0, 'Q', 'A');
    // Build up a long interval
    let c = card;
    for (let i = 0; i < 5; i++) c = sm2Update(c, 5);
    expect(c.interval).toBeGreaterThan(1);
    const failed = sm2Update(c, 0);
    expect(failed.interval).toBe(1);
  });

  it('grade 0 (blackout) still reduces easeFactor', () => {
    const card = sm2NewCard('t', 0, 'Q', 'A');
    const failed = sm2Update(card, 0);
    expect(failed.easeFactor).toBeLessThan(2.5);
    expect(failed.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

// ─── sm2Update — idempotence & shape ─────────────────────────────────────────

describe('sm2Update — output shape', () => {
  it('returns a new object (does not mutate the input card)', () => {
    const card = sm2NewCard('t', 0, 'Q', 'A');
    const updated = sm2Update(card, 5);
    expect(updated).not.toBe(card);
    expect(card.easeFactor).toBe(2.5); // original unchanged
  });

  it('preserves question, answer, topicId, and id fields', () => {
    const card = sm2NewCard('topic-xyz', 3, 'Q?', 'A!');
    const updated = sm2Update(card, 5);
    expect(updated.question).toBe('Q?');
    expect(updated.answer).toBe('A!');
    expect(updated.topicId).toBe('topic-xyz');
    expect(updated.id).toBe('topic-xyz::3');
  });
});
