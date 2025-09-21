async function AUTOMATE(){
	console.log('Hook Initiated Successfully');
	
	const product_regex = /^https:\/\/shopee\.ph\/product\/[^\s]+/;
	if(product_regex.test(window.location.href)){
		const shopee_regex = /^https:\/\/s\.shopee\.ph\/[^\s]+/;
		if(shopee_regex.test(bridge.paste())){
			console.log("A");
		 	scrapeShopee();
		}else{
			console.log("B");
			await startMonitor("t_2319149958504140");
		}
	}else{
		console.log("URL: " + window.location.href);
	}
}


//--------------------------- FETCH HOOK START ---------------------------//

function scrapeShopee(){
	const TARGET_URLS = ['get_pc']; 
	const _originalFetch = window.fetch;
	window.fetch = function(input, init = {}) {// 0
		try {
			let url = (typeof input === 'string') ? input : input.url;
			let originalUrl = url;
			let modifiedUrl = url;
			
			const shouldLog = TARGET_URLS.some(keyword => url.includes(keyword));
			if(shouldLog) {
				const urlObj = new URL(url, location.origin);
				const params = urlObj.searchParams;
				if (params.has('filter') && params.has('limit')){
					params.set('filter', '3');
					params.set('limit', '6');
					modifiedUrl = urlObj.toString();
					console.log("final url:", modifiedUrl);
				}
				if (typeof input === 'string') {
					input = modifiedUrl;
				} else {
					input = new Request(modifiedUrl, input);
				}
			}
			
			if (!init.credentials) {
				init.credentials = 'same-origin';
			}
			
			//--------------------- FETCH RESPONSE HANDLING ---------------------//
			return _originalFetch.call(this, input, init).then(response => {//2
				if (!shouldLog) return response;
				const cloned = response.clone();
				cloned.text().then(body => {
					let parsedBody = body;
					try {
						parsedBody = JSON.parse(body);
					}catch (_) {
						console.log("[parsedBody not found] "+modifiedUrl + "\n[at] "+_);
					}
					if(typeof parsedBody === 'object'){
						if(modifiedUrl.includes("get_pc")){
							get_pc(parsedBody);
						}
					}
				}); 
				return response;
			});
			//--------------------- FETCH RESPONSE HANDLING ---------------------//
		} catch (err) {
			console.warn('[Fetch Hook Error]', err);
			return _originalFetch.call(this, input, init);
		}
	};
	
	try {
		Object.defineProperty(window, 'fetch', { configurable: false });
	}catch (e) {
		console.log('Failed to lock fetch: ' + e);
	}
}


function get_pc(json){
	const link = bridge.paste();
	if(!link || !link.includes("http")){
		alert("Unable to continue");
		return;
	}
	//const link = "https://s.shopee.ph/1B5rtRZfvx";// for debug only
	captionGenerator(link, json.data); // Pass link + data to caption generator
}
//--------------------------- FETCH HOOK END ---------------------------//
		
		
		
		
		

//--------------------------- FACEBOOK POSTING ---------------------------//
const pageId = "116774061366019";// page_id
const pageToken = "EAAPk8660QZA8BPXCz88mSILsnEObfGhv1X6LncZAlHmvO8pISzSMHhIJY686ZAfnvPjy8DLPReZApmATeSH5MOKbsr0Xc9lNZBvqcCEn3QPYWTZAb7nAX9D2Q33WUyG8Hi9QDHQAXfxvyDZABtLkf0ZBNs7q0s3f3LxJVfBJQ9jRkZAdYspZBEumtdIcCxqObWZChNSOgOxwpwwAwY4BsjhHj8ZD";
const pageMessagerToken = "EAAJqytBc7LEBPaIVKRdpeQRM3YDuGK1ISXV0CZAKIIKhUZCl2eqTLFnHcAwmOYaJ1M1fzZBs2u0qXHQQx2OsWPZCmj5q0bwnyTcmjaHPgFBsQcPnGabq3OmKOygwZA6ZAXJSusKniwawOGs3VxMeGZCBqZBHxOagYkny0TZBmaLYZAVJ2JAaY4QJVvQ9xEEkJ4pBXBcZAQyDUqACjEuFjd8TvsZD";

// ------------------- MAIN POST FUNCTION ------------------- //
async function postMedia(mediaArray, message, publishDate) {
    var attached_media = [];
    console.log("Uploading media...");
    await sendMessage("t_2319149958504140", "Uploading...");
    console.log(JSON.stringify(mediaArray));

    for (const media of mediaArray) {
        let mediaId = null;

        if (media.type === "photo") {
            mediaId = await uploadPhoto(media.url);
        } else if (media.type === "video") {
			mediaId = await uploadVideo(media.url, message, publishDate);
		}

        if (!mediaId) {
            console.log(`⚠️ Skipped media: ${media.url}`);
            continue;
        }

        // Only photos need attached_media object; videos are posted directly
        if (media.type === "photo"){
			attached_media.push({ media_fbid: mediaId });
        }else if (media.type === "video"){// Video is posted directly, no attached_media
			console.log("✅ Video Post Scheduled Successfully");
            await sendMessage("t_2319149958504140", message);
            startMonitor("t_2319149958504140");
            return; // Return video ID directly for feed post
		}
    }

    if (attached_media.length === 0) {
		alert("❌ No uploaded media found, unable to post");
        console.log("❌ No uploaded media found, unable to post");
        startMonitor("t_2319149958504140");
        //return { error: `No uploaded media found` };
    }

    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                message: message,
                published: "false",
                scheduled_publish_time: publishDate,
                access_token: pageToken,
                attached_media: JSON.stringify(attached_media)
            })
        });

        const result = await res.json();
        if (result.error) {
            console.log("❌ Facebook Post Error:", result.error.message);
            startMonitor("t_2319149958504140");
        }
		
        console.log("✅ Facebook Post Response:", result);
        await sendMessage("t_2319149958504140", message);
        startMonitor("t_2319149958504140");
    } catch (err) {
        console.log("❌ Exception during post:", err.message);
        startMonitor("t_2319149958504140");
    }
}


// ------------------- UPLOAD PHOTO ------------------- //
async function uploadPhoto(photoUrl, caption = "") {
	console.log("Uploading Photo...");
    try {
        const url = `https://graph.facebook.com/v18.0/${pageId}/photos`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                url: photoUrl,
                published: "false",
                access_token: pageToken
            })
        });

        const data = await response.json();
        if (data.error) {
            console.log("❌ Upload Photo Error:", data.error.message);
            return null;
        }
        
        console.log("Photo uploaded with id: "+data.id);
        return data.id;
    } catch (err) {
        console.log("❌ Upload Photo Exception:", err.message);
        return null;
    }
}



// ------------------- UPLOAD VIDEO ------------------- //
async function uploadVideo(videoUrl, description = "", publishDate = null) {
	console.log("Uploading Video: "+videoUrl);
    try {
        const url = `https://graph.facebook.com/v18.0/${pageId}/videos`;
        const params = {
            file_url: videoUrl,
            description: description,
            access_token: pageToken,
            published: "false",
			scheduled_publish_time: publishDate
        };
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params)
        });

        const data = await response.json();
        if (data.error) {
            console.log("❌ Upload Video Error:", data.error.message);
            return null;
        }
        
    	console.log("Video uploaded with id: "+data.id);
		return data.id;
    } catch (err) {
        console.log("❌ Upload Video Exception:", err.message);
        return null;
    }
}


function schedule(attachment, resp){
	getLastScheduledPost().then(post => {// facebook check current scheduled
		if(post){
			const lastDate = new Date(post.scheduled_publish_time * 1000);
			const publish_date = getPublishTime(lastDate);
			postMedia(attachment, resp, publish_date);
		}else{
			alert("No scheduled posts found");
			if(confirm("Do you want to Schedule this post?")){
				const publish_date = getPublishTime(new Date(new Date().getTime() + (1 * 60 * 60 * 1000) ));
				postMedia(attachment, resp, publish_date);
			}
		}
	});
}
//--------------------------- FACEBOOK POSTING ---------------------------//





//--------------------------- FACEBOOK ADVANCE ---------------------------//
async function startMonitor(conversation){
	bridge.copy("KREATION BROWSER");
	let loop = 0;
	console.log("Monitoring Mode...");
	while(true){
		loop += 1;
		console.log("Monitoring Mode Loop: " + loop);
		await monitorConversation(conversation);
		await new Promise(resolve => setTimeout(resolve, 3000));
	}
}


async function sendMessage(conversationId, messageText) {
  console.log("Send Message...");

  try {
    // 1️⃣ Get the conversation participants
    const participantsRes = await fetch(
      `https://graph.facebook.com/v20.0/${conversationId}?fields=participants&access_token=${pageMessagerToken}`
    );
    const participantsData = await participantsRes.json();

    if (participantsData.error) {
      console.log("❌ Error fetching participants:", JSON.stringify(participantsData));
      return null;
    }

    // Find the user (not the page itself)
    const participant = participantsData.participants.data.find(
      (p) => p.id !== pageId // pageId is your Page’s ID
    );

    if (!participant) {
      console.log("❌ No valid user participant found.");
      return null;
    }

    const userPSID = participant.id;

    // 2️⃣ Send the message using me/messages
    const sendRes = await fetch(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${pageMessagerToken}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: userPSID },
          message: { text: messageText },
          messaging_type: "RESPONSE" // ✅ safe because inside 24h
        }),
      }
    );

    const sendData = await sendRes.json();

    if (sendData.error) {
      console.log("❌ Error sending message:", JSON.stringify(sendData));
      return null;
    }

    console.log("✅ Message sent:", JSON.stringify(sendData));
    return sendData;

  } catch (err) {
    console.log("❌ Exception:", err.message);
    return null;
  }
}


async function monitorConversation(conversationId) {
	const url = `https://graph.facebook.com/v20.0/${conversationId}/messages?fields=id,message,created_time&limit=5&access_token=${pageMessagerToken}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (data.error) {
			console.log("❌ Error fetching messages:", JSON.stringify(data));
			return;
		}
		
		if (data.data && data.data.length > 0) {
			const firstMsg = data.data[0];
			const msgText = firstMsg.message || "";
			const urlRegex = /^https:\/\/s\.shopee\.ph\/[^\s]+/;// accepted only https://s.shopee.ph/
		
			if(urlRegex.test(msgText)){
				bridge.copy(msgText);
				bridge.loadUrl(msgText);
			}// else { console.log("⚠️ Message is either 'Post Completed' or not a URL."); }
		}
		return;
	} catch (err) {
		console.log("❌ Exception:", err.message);
	}
}
//--------------------------- FACEBOOK ADVANCE ---------------------------//
		
		
		
		
		
		
		
		
		
		
//--------------------------- CAPTION GENERATOR ---------------------------//
function captionGenerator(link, dataset){
	const title = dataset.item.title;
	const description = dataset.item.description;
	const categories = dataset.item.categories.map(cat => cat.display_name).join(', ');
	
// Prompt + system instruction for AI
const PROMPT = `
[title] ${title}
[url] ${link}
[description] ${description}
[categories] ${categories}
`;

const INSTRUCTION = `
this is your instruction to create a Facebook caption in fluent TAGALOG with the following requirements:
- [title]
-- Transform and optimize into a catchy, attention-grabbing headline that encourages viewers to buy, dont make super long
-- Introduce the central conflict or a major revelation that changes the course of the product
-- add emoji to hook viewers, just like a sales talk to real person in fluent tagalog, add emoji.

- [url]
-- make random attention grabbing like "Dito mabibili 👉 [url]" or any words that can hook viewers

- [description]
-- Expand  with persuasive, detailed, informative
-- act as a saleslady with a fluent language that engage readers
-- add green check emoji of each details 
-- and newline for better understanding the product info, positive salestalk only
-- only information and no downside of the product description
-- no contact or product damages include
-- ask an open-ended question that encourages debate or personal reflection when they buy

- [categories]
- Convert into relevant hashtags (max to 8), optimized for SEO. If too few add related hashtags to reach maximum exposure
- make it Camel Case for better hashtag

-----------------
The final caption format should be: 
-----------------
[title]
[url]

[description]
[categories]
-----------------
`;

query({
	contents: [{
		role: "user",
		parts: [{ text: INSTRUCTION }]
	},{
		role: "user",
		parts: [{ text: PROMPT }]
	}]
}).then((response) => {
	if(!response) return;
	const resp = response.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No content in response";
	console.log("AI Response: " + resp);
	
	//---------------- shopee
	const assets = dataset.product_images;// [images | video]
	var payload_upload = [];
	
	const image_domain = "https://down-ph.img.susercontent.com/file/";
	const _type = "photo";
	
	for(let i=0; i < assets.images.length; i++){
		const _url = image_domain + assets.images[i] + ".webp";
		payload_upload.push({ type: _type, url: _url });
	}
	console.log("image_url: " + JSON.stringify(payload_upload));
	/*
	if(assets.video){
		const video_domain = "https://cvf.shopee.ph/";
		const _type = "video";// support reel or video
		var video_url = "";
		if(assets.video.default_format){
			video_url = assets.video.default_format.url;
		}else if(assets.video.video_id){
			video_url = video_domain + assets.video.video_id;
		}
		payload_upload.push({ type: _type, url: video_url });
		console.log("video_url: " + video_url);
	}else{
		const image_domain = "https://down-ph.img.susercontent.com/file/";
		const _type = "photo";
		
		for(let i=0; i < assets.images.length; i++){
			const _url = image_domain + assets.images[i] + ".webp";
			payload_upload.push({ type: _type, url: _url });
		}
		console.log("image_url: " + JSON.stringify(payload_upload));
	}
	*/
	//---------------- schedule
	//sendMessage("t_2319149958504140", "Scraped Successfully, Please Wait...");
	schedule(payload_upload, resp);
});

}

async function query(payload){
	console.log("Generating Caption..");
	try {
		const response = await fetch(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", 
			{method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-goog-api-key": "AIzaSyDfRduNp12GqNikkSNeYnZo186cCn_f9RY"
			},
			body: JSON.stringify(payload)
		});
	
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		return data;
	} catch (error) {
		console.log("❌ API Error:", error.message);
		return null;
	}
}
//--------------------------- CAPTION GENERATOR ---------------------------//







//--------------------------- SCHEDULE FB POST ---------------------------//
const TIMEZONE = "Asia/Manila";// Philippines time zone
const upload_time = [// Fixed schedule slots (24-hour format)
    6,  // 6 AM
    9,  // 9 AM
    12, // 12 PM
    15, // 3 PM
    17, // 5 PM
    20, // 8 PM
    22, // 10 PM
];

function getPublishTime(lastDate) {
    // Convert last scheduled post to Manila timezone
    const options = { timeZone: "Asia/Manila", hour12: false };
    const phYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Manila" }).format(lastDate);
    const phMonth = new Intl.DateTimeFormat("en", { month: "2-digit", timeZone: "Asia/Manila" }).format(lastDate);
    const phDay = new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "Asia/Manila" }).format(lastDate);
    const phHour = parseInt(new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(lastDate), 10);

    // Find next available slot
    let nextHour = upload_time.find(slot => phHour < slot);

    let nextDate;
    if (nextHour !== undefined) {
        // same day, next slot
        nextDate = new Date(`${phYear}-${phMonth}-${phDay}T${String(nextHour).padStart(2, "0")}:00:00+08:00`);
    } else {
        // move to tomorrow at first slot
        const tomorrow = new Date(`${phYear}-${phMonth}-${phDay}T00:00:00+08:00`);
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextDate = new Date(tomorrow);
        nextDate.setHours(upload_time[0], 0, 0, 0);
    }

    return Math.floor(nextDate.getTime() / 1000); // FB needs seconds
}

// Format timestamp for display
function timeFormat(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleString("en-US", { timeZone: "Asia/Manila" });
}

async function getLastScheduledPost(){
	const url = `https://graph.facebook.com/v21.0/${pageId}/scheduled_posts?fields=id,message,scheduled_publish_time&access_token=${pageToken}`;
	const response = await fetch(url);
	const result = await response.json();
	
	if (result.data && result.data.length > 0){
		result.data.sort((a, b) => a.scheduled_publish_time - b.scheduled_publish_time);
		return result.data[result.data.length - 1];
	} else {
		return null;
	}
}
//--------------------------- SCHEDULE FB POST ---------------------------//


AUTOMATE();
