import valid from './preentry';

describe('Account Create Request Body Validator', () => {
    it('pass', () => {
        expect(valid('ren.suzumiya@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('kira_yamato@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('haru+spring@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('luna.moon@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('rei.kawa_123@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('akira-yuki@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('hana_flower@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('kyo.sakura+-321@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('rio.waves_1@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('sora-kaze123@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('hikari_tsubasa@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('ryuji+-sun@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('shiro.hoshi@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('aya_rainbow@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('ken+-blade_32@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('yumi.blue_sky@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('juro_tanaka+-mail@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('mito.earth123@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('taka_yama@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('michiru.river+-flow@mail.meigetsu.jp')).toBeTruthy();
        expect(valid('123user@domain.abc')).toBeTruthy();
    });
    it('fail', () => {
        expect(valid('john.doe@domain..com')).toBeFalsy();
        expect(valid('jane.doe@domain-.com')).toBeFalsy();
        expect(valid('foo.bar@-example.com')).toBeFalsy();
        expect(valid('alice_bob@mail.example123')).toBeFalsy();
        expect(valid('jack.smith@domain.123')).toBeFalsy();
        expect(valid('mike.brown@domain..jp')).toBeFalsy();
        expect(valid('sara.davis@domain.abc123')).toBeFalsy();
        expect(valid('kevin_lee@.example.com')).toBeFalsy();
        expect(valid('emily.clark@example.')).toBeFalsy();
        expect(valid('sophia-woods@domain.1jp')).toBeFalsy();
        expect(valid('@domain.com')).toBeFalsy();
        expect(valid('john@@domain.com')).toBeFalsy();
        expect(valid('.foo.bar@domain.com')).toBeFalsy();
        expect(valid('user@domain_com')).toBeFalsy();
        expect(valid('foo@bar@domain.com')).toBeFalsy();
        expect(valid('user@domain.c')).toBeFalsy();
        expect(valid('user@@example..com')).toBeFalsy();
        expect(valid('user@domain,com')).toBeFalsy();
        expect(valid('user@domain!com')).toBeFalsy();
    });
});
