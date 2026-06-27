import * as z from 'zod'
export const loginschema = z.object({

    email: z.string().nonempty('required').email('invalid email'),

    password: z
        .string()
        .nonempty("Password is required")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password must contain at least 8 characters, uppercase, lowercase, number, and special character"
        ),


})
    

export type loginschemaform = z.infer<typeof loginschema>