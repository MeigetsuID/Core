import * as Pattern from './Pattern';
import { v4 as uuidv4, v3 as uuidv3 } from 'uuid';

describe('Pattern Check', () => {
    it('System ID', () => {
        expect('4010404006753').toMatch(Pattern.SystemIDPattern);
        expect('0704550000003').toMatch(Pattern.SystemIDPattern);
        expect('704550000243').not.toMatch(Pattern.SystemIDPattern);
    });

    it('Virtual ID', () => {
        expect(`vid-${uuidv4().replace(/-/g, '')}`).toMatch(Pattern.VirtualIDPattern);
        expect(`app-${uuidv4().replace(/-/g, '')}`).not.toMatch(Pattern.VirtualIDPattern);
        expect(`vid-${uuidv4()}`).not.toMatch(Pattern.AppIDPattern);
        expect(`vid-${uuidv3('hello', uuidv3.DNS)}`).not.toMatch(Pattern.VirtualIDPattern);
    });

    it('App ID', () => {
        expect(`app-${uuidv4().replace(/-/g, '')}`).toMatch(Pattern.AppIDPattern);
        expect(`vid-${uuidv4().replace(/-/g, '')}`).not.toMatch(Pattern.AppIDPattern);
        expect(`app-${uuidv4()}`).not.toMatch(Pattern.AppIDPattern);
        expect(`app-${uuidv3('hello', uuidv3.DNS)}`).not.toMatch(Pattern.AppIDPattern);
    });
});
