import PickupToken from './TokenPicker';

describe('Token Picker Test', () => {
    it('Basic Authorization', () => {
        expect(PickupToken('Basic dGVzdDpwYXNzd29yZA==')).toStrictEqual({
            token_type: 'Basic',
            id: 'test',
            password: 'password',
        });
    });
    it('Bearer Authorization', () => {
        expect(PickupToken('Bearer token')).toStrictEqual({
            token_type: 'Bearer',
            token: 'token',
        });
    });
    it('Invalid Authorization', () => {
        expect(PickupToken('Invalid token')).toBeNull();
    });
});
