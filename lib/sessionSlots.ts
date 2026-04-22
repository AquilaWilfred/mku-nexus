// Session slot definitions for the university timetable system
export const SESSION_SLOTS = [
  { label: 'Session 1', display: '07:00 – 10:00', start: '07:00:00', end: '10:00:00' },
  { label: 'Session 2', display: '10:00 – 13:00', start: '10:00:00', end: '13:00:00' },
  { label: 'Session 3', display: '13:00 – 16:00', start: '13:00:00', end: '16:00:00' },
  { label: 'Session 4', display: '16:00 – 19:00', start: '16:00:00', end: '19:00:00' },
]

// Valid start times for validation
export const VALID_STARTS = SESSION_SLOTS.map(slot => slot.start)