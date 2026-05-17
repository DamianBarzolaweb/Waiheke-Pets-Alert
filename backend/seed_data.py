# Imágenes de demostración: URLs de Google AIDA a menudo no cargan en <img> (403 / caducan).
# Unsplash permite hotlinking en desarrollo; en producción conviene subir a Cloudinary u otro CDN.
DEMO_IMAGES = {
    "cooper": "https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200&q=80&auto=format&fit=crop",
    "midnight": "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=1200&q=80&auto=format&fit=crop",
    "pip": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1200&q=80&auto=format&fit=crop",
    "shadow": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80&auto=format&fit=crop",
}

# Datos iniciales — se insertan si la DB está vacía
INITIAL_ALERTS = [
    {
        "id": "cooper",
        "name": "Cooper",
        "status": "Lost",
        "species": "dog",
        "breed": "Golden Retriever",
        "breedVariant": "tertiary",
        "location": "Oneroa Village near Library",
        "lat": -36.7904,
        "lng": 175.0101,
        "description": (
            "Last seen wandering near the library. Wearing a blue collar with a bell. "
            "Very friendly but might be scared."
        ),
        "imageUrl": DEMO_IMAGES["cooper"],
        "imageAlt": (
            "Golden retriever dog sitting in tall grass on a Waiheke hillside "
            "overlooking the ocean at sunset"
        ),
        "dateReported": "10 Apr 2026, 2:22 pm",
        "lastSeenWindow": "Last seen near Oneroa Library — west side steps",
        "detailLocation": "Oneroa Village, Waiheke Island",
        "fullDescription": (
            "Cooper slipped his lead near the library green. He is wearing a blue collar "
            "with a small silver bell and an engraved tag. He is gentle with people but "
            "may bolt if startled by loud traffic. Please avoid chasing; call softly and "
            "offer treats if you see him."
        ),
        "sightings": [
            {
                "id": "s1",
                "author": "Alex T.",
                "timeAgo": "45m ago",
                "body": "Thought I saw a similar dog near the ferry queue — couldn’t confirm the collar.",
            },
            {
                "id": "s2",
                "author": "Moana K.",
                "timeAgo": "2h ago",
                "body": "Will keep treats in my pack on the walk home tonight.",
            },
        ],
    },
    {
        "id": "midnight",
        "name": "Midnight",
        "status": "Sighted",
        "species": "cat",
        "breed": "Bombay Mix",
        "breedVariant": "secondary",
        "location": "Palm Beach Reserve",
        "lat": -36.7971,
        "lng": 175.067,
        "description": (
            "Found taking shelter under a bench. No collar found. Safe in our backyard now, "
            "please contact to identify."
        ),
        "imageUrl": DEMO_IMAGES["midnight"],
        "imageAlt": (
            "Sleek black cat with yellow eyes resting on a weathered wooden deck with "
            "native New Zealand ferns in background"
        ),
        "dateReported": "10 Apr 2026, 9:10 am",
        "lastSeenWindow": "Sheltering under the northern picnic bench",
        "detailLocation": "Palm Beach Reserve, Waiheke Island",
        "fullDescription": (
            "Small black cat with bright amber eyes. No collar. Very calm indoors. "
            "We can hold safely while an owner comes forward — please message with identifying details only."
        ),
        "sightings": [
            {
                "id": "s3",
                "author": "Sam R.",
                "timeAgo": "3h ago",
                "body": "Posted to the local FB group as well — fingers crossed.",
            },
        ],
    },
    {
        "id": "pip",
        "name": "Pip",
        "status": "Lost",
        "species": "dog",
        "breed": "Jack Russell",
        "breedVariant": "tertiary",
        "location": "Little Oneroa Beach",
        "lat": -36.7836,
        "lng": 175.0198,
        "description": (
            "Ran off chasing a bird near the playground. Wearing a red harness. "
            "Very fast, please do not chase."
        ),
        "imageUrl": DEMO_IMAGES["pip"],
        "imageAlt": (
            "Small white terrier mix looking curious on a gravel path near a coastal beach "
            "with turquoise water"
        ),
        "dateReported": "9 Apr 2026, 6:40 pm",
        "lastSeenWindow": "Playground end of Little Oneroa — red harness",
        "detailLocation": "Little Oneroa Beach, Waiheke Island",
        "fullDescription": (
            "Pip is quick and will bolt if pursued. Please call from a distance and crouch down — "
            "he responds to a two-note whistle. Red harness with a small Waiheke tag."
        ),
        "sightings": [
            {
                "id": "s4",
                "author": "Jordan P.",
                "timeAgo": "6h ago",
                "body": "Keeping an eye out on my evening run route.",
            },
            {
                "id": "s5",
                "author": "Ella M.",
                "timeAgo": "7h ago",
                "body": "Will check the coastal track cameras tonight.",
            },
        ],
    },
    {
        "id": "shadow",
        "name": "Shadow",
        "status": "Sighted",
        "species": "dog",
        "breed": "Border Collie",
        "breedVariant": "secondary",
        "location": "Surfdale Track",
        "lat": -36.8065,
        "lng": 175.042,
        "description": (
            "Found wandering the track alone. Has a microchip tag but we couldn't read the phone number. "
            "Currently safe at the vet."
        ),
        "imageUrl": DEMO_IMAGES["shadow"],
        "imageAlt": (
            "Fluffy border collie running on a lush green field with scattered coastal "
            "shrubs and overcast sky"
        ),
        "dateReported": "9 Apr 2026, 11:05 am",
        "lastSeenWindow": "Mid-track between Surfdale and Ostend junction",
        "detailLocation": "Surfdale Track, Waiheke Island",
        "fullDescription": (
            "Border collie, medium coat, microchip tag present. Currently with the island vet "
            "for a chip scan and temporary care. Proof of ownership will be required for release."
        ),
        "sightings": [
            {
                "id": "s6",
                "author": "Vet clinic",
                "timeAgo": "11h ago",
                "body": "Stable, hydrated, and resting. Thank you to the finder.",
            },
        ],
    },
]
