import test from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD_MIN_LENGTH, getPasswordRequirementErrors, isValidEmail } from '../../../server/utils/validators.js';

test('isValidEmail akzeptiert gueltige E-Mails und trimmt Leerzeichen', () => {
	assert.equal(isValidEmail('  user@example.com  '), true);
	assert.equal(isValidEmail('first.last+tag@example.co.uk'), true);
});

test('isValidEmail lehnt leere oder ungueltige E-Mails ab', () => {
	assert.equal(isValidEmail(''), false);
	assert.equal(isValidEmail('kein-email-format'), false);
	assert.equal(isValidEmail('user@localhost'), false);
});

test('getPasswordRequirementErrors meldet alle fehlenden Anforderungen', () => {
	assert.deepEqual(getPasswordRequirementErrors('abc'), [
		`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`,
		'Einen Großbuchstaben',
		'Eine Zahl'
	]);
});

test('getPasswordRequirementErrors meldet nur die jeweils fehlenden Anforderungen', () => {
	assert.deepEqual(getPasswordRequirementErrors('abcdefgh'), ['Einen Großbuchstaben', 'Eine Zahl']);
	assert.deepEqual(getPasswordRequirementErrors('Abcdefgh'), ['Eine Zahl']);
});

test('getPasswordRequirementErrors akzeptiert ein ausreichend starkes Passwort', () => {
	assert.deepEqual(getPasswordRequirementErrors('Abcdefg1'), []);
});
