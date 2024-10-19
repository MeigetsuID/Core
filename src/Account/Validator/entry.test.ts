import { valid } from './entry';

describe('Account Entry Request Body Validator', () => {
    describe('pass', () => {
        it('personal', () => {
            expect(
                valid({
                    user_id: 'testuser01',
                    name: 'テストユーザー',
                    password: 'password01',
                })
            ).toBeTruthy();
        });
        it('corp/corp number', () => {
            expect(
                valid({
                    user_id: '01testuser',
                    corp_number: '1234567890123',
                    password: 'password01',
                })
            ).toBeTruthy();
        });
        it('corp/corp registry number', () => {
            expect(
                valid({
                    user_id: 'test_user',
                    corp_number: '123456789012',
                    password: 'password01',
                })
            ).toBeTruthy();
        });
    });
    describe('fail', () => {
        describe('personal', () => {
            it('key is missing', () => {
                expect(
                    valid({
                        name: 'テストユーザー',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        name: 'テストユーザー',
                    })
                ).toBeFalsy();
            });
        });
        describe('corp', () => {
            it('key is missing', () => {
                expect(
                    valid({
                        corp_number: '1234567890123',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        corp_number: '1234567890123',
                    })
                ).toBeFalsy();
            });
            it('corp number is invalid', () => {
                expect(
                    valid({
                        user_id: 'test',
                        corp_number: '12345678901234',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        corp_number: '12345678901',
                        password: 'password01',
                    })
                ).toBeFalsy();
                expect(
                    valid({
                        user_id: 'test',
                        corp_number: '0123456789012',
                        password: 'password01',
                    })
                ).toBeFalsy();
            });
        });
    });
});
