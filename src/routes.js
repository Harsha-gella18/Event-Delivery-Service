const express = require('express');
const crypto = require('crypto');
const db = require('./db');

const router = express.Router();

router.post('/events', (req, res) => {
  const { type, payload, webhook_url } = req.body;

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type is required and must be a string' });
  }
  if (payload === undefined || payload === null || typeof payload !== 'object') {
    return res.status(400).json({ error: 'payload is required and must be an object' });
  }
  if (!webhook_url || typeof webhook_url !== 'string') {
    return res.status(400).json({ error: 'webhook_url is required and must be a string' });
  }

  const event = db.createEvent({
    id: crypto.randomUUID(),
    type,
    payload,
    webhook_url,
    created_at: new Date().toISOString(),
  });

  return res.status(201).json(event);
});

router.get('/events', (_req, res) => {
  const events = db.getAllEvents();
  return res.status(200).json(events);
});

router.get('/events/:id', (req, res) => {
  const event = db.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  return res.status(200).json(event);
});

router.post('/events/:id/retry', (req, res) => {
  const result = db.requeueDeadEvent(req.params.id, new Date().toISOString());

  if (!result) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (result.error === 'not_dead') {
    return res.status(400).json({ error: 'Event is not dead; manual retry only applies to dead events' });
  }

  return res.status(200).json(result);
});

module.exports = router;
