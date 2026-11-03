<?php
/**
 * Unit Test for Lovley CpsGateway
 */
require_once __DIR__ . '/../core/CpsGateway.php';

echo "Running CPS Gateway Unit Tests...\n";

// Test 1: getCampaigns returns an array
$campaigns = CpsGateway::getCampaigns();
assert(is_array($campaigns), 'getCampaigns should return array');
echo "✓ Test 1 Passed: getCampaigns returns array\n";

// Test 2: saveCampaign and verify persistence
$testCampaign = [
    'enabled' => true,
    'usePlaywright' => true,
    'interval_minutes' => 15,
    'country' => 'US',
    'links' => [
        ['url' => 'https://example.com/target', 'solver' => 'puppeteer', 'ratio' => 1]
    ]
];
$saved = CpsGateway::saveCampaign('unit_test_campaign', $testCampaign);
assert($saved === true, 'saveCampaign should return true on success');

$campaignsAfter = CpsGateway::getCampaigns();
assert(isset($campaignsAfter['unit_test_campaign']), 'unit_test_campaign should exist in campaigns');
assert($campaignsAfter['unit_test_campaign']['country'] === 'US', 'Campaign country should match');
echo "✓ Test 2 Passed: saveCampaign and getCampaigns work correctly\n";

// Test 3: getCampaignStatus includes the campaign
$statusList = CpsGateway::getCampaignStatus();
assert(is_array($statusList), 'getCampaignStatus should return array');
$found = false;
foreach ($statusList as $item) {
    if ($item['name'] === 'unit_test_campaign') {
        $found = true;
        assert($item['enabled'] === true, 'Status enabled should be true');
        break;
    }
}
assert($found === true, 'unit_test_campaign should appear in status list');
echo "✓ Test 3 Passed: getCampaignStatus returns valid structure\n";

// Test 4: deleteCampaign
$deleted = CpsGateway::deleteCampaign('unit_test_campaign');
assert($deleted === true, 'deleteCampaign should return true');
$campaignsFinal = CpsGateway::getCampaigns();
assert(!isset($campaignsFinal['unit_test_campaign']), 'unit_test_campaign should be deleted');
echo "✓ Test 4 Passed: deleteCampaign cleans up properly\n";

// Test 5: Proxies management
$testProxies = [
    ['host' => '1.1.1.1', 'port' => 8080, 'country' => 'US']
];
CpsGateway::saveProxies($testProxies);
$loadedProxies = CpsGateway::getProxies();
assert(count($loadedProxies) === 1, 'Should have 1 proxy');
assert($loadedProxies[0]['host'] === '1.1.1.1', 'Proxy host should match');
CpsGateway::saveProxies([]); // clean up
echo "✓ Test 5 Passed: saveProxies and getProxies work properly\n";

echo "All CPS Gateway unit tests passed successfully!\n";
