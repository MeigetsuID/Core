export type Bearer = { token_type: 'Bearer'; token: string };
export type Basic = { token_type: 'Basic'; id: string; password: string };

export default function PickupToken(AuthorizationHeader: string): Bearer | Basic | null {
    const [token_type, token] = AuthorizationHeader.split(' ');
    if (token_type === 'Bearer') return { token_type, token };
    else if (token_type === 'Basic') {
        const [id, password] = Buffer.from(token, 'base64').toString().split(':');
        return { token_type, id, password };
    }
    return null;
}
