import Ajv from 'ajv';
const ajv = new Ajv();

const schemaForPersonal = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9_]{4,19}$',
        },
        name: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
    },
    additionalProperties: false,
};

const schemaForCorp = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9_]{4,19}$',
        },
        password: {
            type: 'string',
        },
    },
    additionalProperties: false,
};

const validPersonal = ajv.compile(schemaForPersonal);
const validCorp = ajv.compile(schemaForCorp);

export function valid(arg: any) {
    return validPersonal(arg) || validCorp(arg);
}
