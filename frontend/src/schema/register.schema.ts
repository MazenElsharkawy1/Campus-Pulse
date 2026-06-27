import * as z from 'zod'

export const registerschema = z.object({
  name: z.string().nonempty('required').min(2, 'minimum 2 letters').max(30, 'max name length'),
  
  email: z
    .string()
    .nonempty('Email is required')
    .email('Invalid email format')
    .refine(
      (email) => {
        const allowedDomains = [
          'mti.edu.eg',
          
        ];
        
        const domain = email.split('@')[1]?.toLowerCase();
        return domain && allowedDomains.includes(domain);
      },
      {
        message: "Only MTI University emails are allowed (@mti.edu.eg or faculty subdomains)",
      }
    ),

  phone: z
    .string()
    .nonempty("Phone number is required")
    .regex(
      /^01[0-2,5][0-9]{8}$/,
      "Phone number must be a valid Egyptian number"
    ),

  // studentId: ... (you removed it from form, but kept in schema – decide if you want to keep or remove)

  

  password: z
    .string()
    .nonempty("Password is required")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least 8 characters, uppercase, lowercase, number, and special character"
    ),

  repassword: z.string().nonempty("Confirm password is required"),

  

  interests: z.array(z.string()).min(1, 'Select at least one interest'),
})
  .refine((data) => data.password === data.repassword, {
    message: "Passwords do not match",
    path: ["repassword"],
  });

export type registerschemaform = z.infer<typeof registerschema>;