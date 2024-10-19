import { readFile } from 'nodeeasyfileio';
import CorpProfileGenerator from '@meigetsuid/corpprofilegen';

global.fetch = jest.fn((url, options) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : '';
    // 国税庁法人番号検索ＡＰＩ
    if (urlString.includes('nta.go.jp')) {
        const query = new URL(urlString).searchParams.get('number');
        if (query == null) return Promise.reject('no query');
        return Promise.resolve(new Response(readFile('./testdata/nta.go.jp/' + query + '.xml'), {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
            },
        }));
    }
    // Meigetsu Working Total Assistant System API
    else if (urlString.includes('localhost:7900')) {
        if (options == null) return Promise.reject('no options');
        switch(options.method) {
            case 'POST':
                return Promise.resolve(new Response());
            default:
                return Promise.reject('no method');
        }
    }
    return Promise.reject('unsupported url');
});

describe('Mock Check', () => {
    const CPG = new CorpProfileGenerator('dummy');
    it('NTA API 1', async () => {
        const res = await CPG.Create({
            corp_number: '4010404006753',
            user_id: 'meigetsu2020',
            mailaddress: 'info@mail.meigetsu.jp',
            password: 'password01',
        });
        expect(res).toStrictEqual({
            id: '4010404006753',
            user_id: 'meigetsu2020',
            name: '明月',
            mailaddress: 'info@mail.meigetsu.jp',
            password: 'password01',
            account_type: 3,
        });
    });
    it('NTA API 2', async () => {
        const res = await CPG.GetNewestName('1000011000005');
        expect(res).toBe('国立国会図書館');
    });
});
