import { valid } from './update';

describe('Validator for update', () => {
    describe('personal', () => {
        describe('Single information update', () => {
            it('User ID', () => {
                expect(valid({ user_id: 'testuserid2020' })).toBe(true);
            });
            it('Name', () => {
                expect(valid({ name: 'test' })).toBe(true);
            });
            it('Password', () => {
                expect(valid({ password: 'test' })).toBe(true);
            });
        });
        describe('Multiple information update', () => {
            it('User ID and Name', () => {
                expect(valid({ user_id: 'testuserid2020', name: 'test' })).toBe(true);
            });
            it('User ID and Password', () => {
                expect(valid({ user_id: 'testuserid2020', password: 'test' })).toBe(true);
            });
            it('Name and Password', () => {
                expect(valid({ name: 'test', password: 'test' })).toBe(true);
            });
            it('All', () => {
                expect(valid({ user_id: 'testuserid2020', name: 'test', password: 'test' })).toBe(true);
            });
        });
        it('Additional Properties', () => {
            expect(valid({ user_id: 'testuserid2020', name: 'test', password: 'test', account_type: 0 })).toBe(false);
        });
    })
});