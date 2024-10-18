import Ajv from 'ajv';
const ajv = new Ajv();

const schema = {
    type: 'string',
    pattern: '^[a-zA-Z0-9_+-]+(\\.[a-zA-Z0-9_+-]+)*@[a-zA-Z0-9]+(\\.[a-zA-Z0-9-]+)*\\.[a-zA-Z]{2,}$',
    maxLength: 256,
};

const valid = ajv.compile(schema);

export default valid;
