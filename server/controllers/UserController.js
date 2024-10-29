import { Webhook } from "svix"
import userModel from "../models/userModel.js"

// Api to mange Clerk user with database
// https://localhost:4000/api/user/webhooks
const clerkWebhooks = async (req,res) => {

 try {
    // Create Svix with clerk webhook
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

    await whook.verify(JSON.stringify(req.body),{
        "svix-id":req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"]
    })

    const {data, type} = req.body

    switch (type) {
        case "user.created": {
            // Insert user data into database
            // Example: await User.create({...data})
            const userData = {
                clerkId: data.id,
                email: data.email_addresses[0].email_address,
                firstName: data.first_name,
                lastName: data.last_name,
                photo: data.image_url

            }

            await userModel.create(userData)
            res.json({})
            
            break;
        }
        case "user.updated":{
            // Update user data in database
            // Example: await User.updateOne({_id: data.id}, {...data})
            const userData = {

                email: data.email_addresses[0].email_address,
                firstName: data.first_name,
                lastName: data.last_name,
                photo: data.image_url
            }

            await userModel.findOneAndUpdate({clerkId:data.id},userData)
            res.json({})

            break;

        }
        case "user.deleted":{
            // Delete user data from database
            // Example: await User.deleteOne({_id: data.id})
            await userModel.findOneAndDelete({clerkId:data.id})
            res.json({})

            break;
        }
        default:
          //  console.log(`Unhandled webhook type: ${type}`)
            break;
    }
} catch (error) {
    console.log(error.message)
    res.json({success:false, message:error.message})
}

}

export { clerkWebhooks }
