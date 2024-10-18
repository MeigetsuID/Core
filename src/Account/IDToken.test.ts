import { CreateIDToken } from './IDToken';
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'nodeeasyfileio';

describe('CreateIDToken', () => {
    it('same/contain expires_min', () => {
        const arg = {
            virtual_id: 'vid-' + uuidv4().replace(/-/g, ''),
            app_id: 'app-' + uuidv4().replace(/-/g, ''),
            user_id: 'test',
            name: 'テストユーザー',
            mailaddress: 'test@mail.meigetsu.jp',
            account_type: 4,
            issue_at: new Date(),
            expires_min: 360,
            nonce: 'nonce',
            age_rate: 'Z',
        };
        const payload = {
            sub: arg.virtual_id,
            aud: arg.app_id,
            iat: arg.issue_at.getTime(),
            iss: 'https://idportal.meigetsu.jp',
            exp: arg.issue_at.getTime() + arg.expires_min * 60000,
            email: arg.mailaddress,
            uid: arg.user_id,
            name: arg.name,
            type: arg.account_type,
            nonce: arg.nonce,
            age: arg.age_rate,
        };
        expect(CreateIDToken(arg)).toBe(sign(payload, readFile('./system/openid/private.key'), { algorithm: 'RS256' }));
    });
    it('same/not contain expires_min', () => {
        const arg = {
            virtual_id: 'vid-' + uuidv4().replace(/-/g, ''),
            app_id: 'app-' + uuidv4().replace(/-/g, ''),
            user_id: 'test',
            name: 'テストユーザー',
            mailaddress: 'test@mail.meigetsu.jp',
            account_type: 4,
            issue_at: new Date(),
            nonce: 'nonce',
            age_rate: 'Z',
        };
        const payload = {
            sub: arg.virtual_id,
            aud: arg.app_id,
            iat: arg.issue_at.getTime(),
            iss: 'https://idportal.meigetsu.jp',
            exp: arg.issue_at.getTime() + 480 * 60000,
            email: arg.mailaddress,
            uid: arg.user_id,
            name: arg.name,
            type: arg.account_type,
            nonce: arg.nonce,
            age: arg.age_rate,
        };
        expect(CreateIDToken(arg)).toBe(
            sign(payload, readFile('./system/openid/private.key'), {
                algorithm: 'RS256',
            })
        );
    });
    it('verify', () => {
        const arg = {
            virtual_id: 'vid-' + uuidv4().replace(/-/g, ''),
            app_id: 'app-' + uuidv4().replace(/-/g, ''),
            user_id: 'test',
            name: 'テストユーザー',
            mailaddress: 'test@mail.meigetsu.jp',
            account_type: 4,
            issue_at: new Date(),
            expires_min: 480,
            nonce: 'nonce',
            age_rate: 'Z',
        };
        const payload = {
            sub: arg.virtual_id,
            aud: arg.app_id,
            iat: arg.issue_at.getTime(),
            iss: 'https://idportal.meigetsu.jp',
            exp: arg.issue_at.getTime() + arg.expires_min * 60000,
            email: arg.mailaddress,
            uid: arg.user_id,
            name: arg.name,
            type: arg.account_type,
            nonce: arg.nonce,
            age: arg.age_rate,
        };
        const result = verify(CreateIDToken(arg), readFile('./system/openid/public.key'), { algorithms: ['RS256'] });
        expect(result).toStrictEqual(payload);
    });
});
