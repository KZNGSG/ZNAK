import requests
import sys
from datetime import datetime

class ProMarkiruiAPITester:
    def __init__(self, base_url="https://signhelper-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.text else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_health(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        if success and response.get('status') == 'ok':
            print(f"   Service: {response.get('service')}")
            return True
        return False

    def test_get_categories(self):
        """Test get categories endpoint"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "api/check/categories",
            200
        )
        if success and 'groups' in response:
            print(f"   Found {len(response['groups'])} category groups")
            return True
        return False

    def test_assess_product_requires_marking(self):
        """Test product assessment - requires marking"""
        success, response = self.run_test(
            "Assess Product (Requires Marking)",
            "POST",
            "api/check/assess",
            200,
            data={
                "category": "pharma",
                "subcategory": "medicines",
                "source": "produce",
                "volume": "100-1000"
            }
        )
        if success and response.get('requires_marking') == True:
            print(f"   Message: {response.get('message')[:80]}...")
            print(f"   Steps: {len(response.get('steps', []))} steps")
            return True
        return False

    def test_assess_product_no_marking(self):
        """Test product assessment - no marking required"""
        success, response = self.run_test(
            "Assess Product (No Marking)",
            "POST",
            "api/check/assess",
            200,
            data={
                "category": "cosmetics",
                "subcategory": "cosmetics_items",
                "source": "buy_rf",
                "volume": "<100"
            }
        )
        if success and response.get('requires_marking') == False:
            print(f"   Message: {response.get('message')[:80]}...")
            return True
        return False

    def test_get_countries(self):
        """Test get countries endpoint"""
        success, response = self.run_test(
            "Get Countries",
            "GET",
            "api/import/countries",
            200
        )
        if success and 'countries' in response:
            print(f"   Found {len(response['countries'])} countries")
            return True
        return False

    def test_get_import_categories(self):
        """Test get import categories endpoint"""
        success, response = self.run_test(
            "Get Import Categories",
            "GET",
            "api/import/categories",
            200
        )
        if success and 'groups' in response:
            print(f"   Found {len(response['groups'])} category groups")
            return True
        return False

    def test_get_import_schemes(self):
        """Test get import schemes endpoint"""
        success, response = self.run_test(
            "Get Import Schemes",
            "GET",
            "api/import/schemes",
            200,
            params={"country": "CN", "category": "food"}
        )
        if success and 'schemes' in response:
            print(f"   Found {len(response['schemes'])} import schemes")
            return True
        return False

    def test_recommend_equipment(self):
        """Test equipment recommendation endpoint"""
        success, response = self.run_test(
            "Recommend Equipment",
            "POST",
            "api/equipment/recommend",
            200,
            data={
                "facility_type": "production",
                "daily_volume": "100-1000",
                "has_equipment": ["printer"]
            }
        )
        if success and 'items' in response:
            print(f"   Items: {len(response['items'])}")
            print(f"   Budget: {response.get('budget_min')} - {response.get('budget_max')} ₽")
            return True
        return False

    def test_send_contact_form(self):
        """Test contact form submission"""
        success, response = self.run_test(
            "Send Contact Form",
            "POST",
            "api/contact/send",
            200,
            data={
                "name": "Test User",
                "phone": "+7 (999) 123-45-67",
                "email": "test@example.com",
                "request_type": "Консультация по маркировке",
                "comment": "Test comment",
                "consent": True
            }
        )
        if success and response.get('status') == 'success':
            print(f"   Message: {response.get('message')}")
            return True
        return False

    def test_contact_form_validation(self):
        """Test contact form validation (missing consent)"""
        success, response = self.run_test(
            "Contact Form Validation",
            "POST",
            "api/contact/send",
            422,  # Validation error expected
            data={
                "name": "Test User",
                "phone": "+7 (999) 123-45-67",
                "email": "test@example.com",
                "request_type": "Консультация по маркировке",
                "comment": "Test comment",
                "consent": False  # Should fail validation
            }
        )
        return success

def main():
    print("=" * 60)
    print("🚀 Starting Про.Маркируй API Tests")
    print("=" * 60)
    
    tester = ProMarkiruiAPITester()
    
    # Run all tests
    print("\n📋 BASIC ENDPOINTS")
    tester.test_health()
    
    print("\n📋 CHECK PRODUCT FLOW")
    tester.test_get_categories()
    tester.test_assess_product_requires_marking()
    tester.test_assess_product_no_marking()
    
    print("\n📋 IMPORT FLOW")
    tester.test_get_countries()
    tester.test_get_import_categories()
    tester.test_get_import_schemes()
    
    print("\n📋 EQUIPMENT FLOW")
    tester.test_recommend_equipment()
    
    print("\n📋 CONTACT FORM")
    tester.test_send_contact_form()
    tester.test_contact_form_validation()
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Summary")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"  - {failed.get('test')}: {failed.get('endpoint')}")
            if 'error' in failed:
                print(f"    Error: {failed['error']}")
            else:
                print(f"    Expected: {failed.get('expected')}, Got: {failed.get('actual')}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
