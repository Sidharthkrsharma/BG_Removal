import razorpay from 'razorpay';
import { Webhook } from "svix";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

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



// Api Controller functions to get available credits data
const userCredits = async (req,res) => {
    try{

        const { clerkId } = req.body

        const userData = await userModel.findOne({ clerkId })

        res.json({ success: true, credits: userData.creditBalance })

    } catch (error) {
    console.log(error.message)
    res.json({success:false, message:error.message})
    }
}

    // Payment Gateway initialization
    const razorpayInstance = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Payment Gateway API call to create a payment
    const paymentRazorpay = async (req, res) => {
        try {

            const { clerkId , planId } = req.body

            const userData = await userModel.findOne({ clerkId })

            if (!userData || !planId) {
                return res.json({ success: false, message: 'Invaild Credentials' })
            }

            let credits, plan, amount, date 

            switch (planId) {
                case 'Basic':
                    plan = 'Basic'
                    credits = 100
                    amount = 10
                    break;

                    case 'Advanced':
                        plan = 'Advanced'
                        credits = 500
                        amount = 50
                        break;

                        case 'Business':
                            plan = 'Business'
                            credits = 5000
                            amount = 250
                            break;

                default:
                    break;
            }

            date = Date.now()

            // create transaction 
            const transactionData = {
                clerkId,
                plan,
                amount,
                credits,
                date
            }

            const newTransaction = await transactionModel.create(transactionData)

            // create payment order
            const options = {
                amount: amount * 100,
                currency: process.env.CURRENCY,
                receipt: newTransaction._id,
                payment_capture: 1
            }

            await razorpayInstance.orders.create(options,(error, order) => {
            if (error) {
                return res.json({ success: false, message: error.message })
            }
            res.json({ success: true, message: 'Payment Order Created', order })
            })

        } catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
        }
    }

    // Return payment gateway response to the client and verify 
    const verifyRazorpay = async (req, res) => {
        try {
            const { razorpay_order_id } = req.body

            const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

            if (orderInfo.status === 'paid') {
                const transactionData = await transactionModel.findById(orderInfo.receipt)
                if(transactionData.payment) {
                    return res.json({ success: false, message: 'Payment Failed' })
                }
                // add credits to user account
                const userData = await userModel.findOne({ clerkId: transactionData.clerkId })
                const creditBalance = userData.creditBalance + transactionData.credits
                await userModel.findByIdAndUpdate(userData._id,{creditBalance})

                // update transaction data
                await transactionModel.findByIdAndUpdate(transactionData._id,{payment:true})

                res.json({ success: true, message: 'Payment Successful' })
            }

        } catch (error) {

        }
    }

export { clerkWebhooks, paymentRazorpay, userCredits, verifyRazorpay };

