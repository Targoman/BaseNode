import Joi from "joi"

const JoiUUID = Joi.extend(joi => {
    return {
        type: "uuid",
        base: joi.string(),
        messages: {
            "uuid.base": "{{#lablel}} must be of type uuid-v6"
        },
        validate(value: string, helpers) {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) !== true)
                return { value, errors: helpers.error('uuid.base') };
        }
    }
})

export default JoiUUID