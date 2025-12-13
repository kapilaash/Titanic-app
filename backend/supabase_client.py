import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print(f"🔧 Debug: SUPABASE_URL = {SUPABASE_URL}")
print(f"🔧 Debug: SUPABASE_KEY = {SUPABASE_KEY}")

# Check if environment variables are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing Supabase credentials!")
    print("   Please check your .env file exists and contains:")
    print("   SUPABASE_URL=your_url_here")
    print("   SUPABASE_KEY=your_key_here")
    
    # Try to load from direct assignment as fallback
    try:
        SUPABASE_URL = "https://qvmxtazvxtezzysgheer.supabase.co"
        SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXh0YXp2eHRlenp5c2doZWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA0MzA4OCwiZXhwIjoyMDc5NjE5MDg4fQ.E_JYUYi57LRPEY0z1N_59jPy7VTspqtEIl1StB0zVRQ"
        print("🔄 Using hardcoded credentials as fallback")
    except:
        raise ValueError("Missing Supabase credentials")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_supabase():
    return supabase

def test_connection():
    try:
        response = supabase.table('titanic_passengers').select("*").limit(1).execute()
        print("✅ Supabase connection successful!")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False