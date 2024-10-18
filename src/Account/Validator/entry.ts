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
    required: ['user_id', 'name', 'password'],
    additionalProperties: false,
};

const schemaForCorp = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9_]{4,19}$',
        },
        corp_number: {
            type: 'string',
            pattern: '^([1-9][0-9]{12}|[0-9]{12})$',
        },
        password: {
            type: 'string',
        },
    },
    required: ['user_id', 'corp_number', 'password'],
    additionalProperties: false,
};

const validPersonal = ajv.compile(schemaForPersonal);
const validCorp = ajv.compile(schemaForCorp);

export default function valid(arg: any) {
    return validPersonal(arg) || validCorp(arg);
}
