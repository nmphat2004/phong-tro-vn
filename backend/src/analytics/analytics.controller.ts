import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeasonalService } from './seasonal.service';
import { NeighborhoodService } from './neighborhood.service';
import { PriceEstimatorService } from './price-estimator.service';
import { GeocodingService } from './geocoding.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private seasonalService: SeasonalService,
    private neighborhoodService: NeighborhoodService,
    private priceEstimatorService: PriceEstimatorService,
    private geocodingService: GeocodingService,
  ) {}

  // GET /analytics/seasonal?district=Quận 1
  @Get('seasonal')
  @ApiOperation({ summary: 'Predict best time to rent by month' })
  getSeasonal(@Query('district') district?: string) {
    return this.seasonalService.predict(district);
  }

  // GET /analytics/neighborhood?lat=10.774&lng=106.696
  @Get('neighborhood')
  @ApiOperation({ summary: 'Analyze neighborhood quality' })
  getNeighborhood(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.neighborhoodService.analyze(parseFloat(lat), parseFloat(lng));
  }

  // GET /analytics/price-estimate?area=25&amenityCount=4&floor=3&address=Quận 1&currentPrice=4500000
  @Get('price-estimate')
  @ApiOperation({ summary: 'Estimate fair price for a room' })
  getPriceEstimate(
    @Query('area') area: string,
    @Query('amenityCount') amenityCount: string,
    @Query('floor') floor: string,
    @Query('address') address: string,
    @Query('currentPrice') currentPrice?: string,
    @Query('type') type?: string,
  ) {
    return this.priceEstimatorService.estimate(
      parseFloat(area),
      parseInt(amenityCount),
      parseInt(floor),
      address,
      currentPrice ? parseFloat(currentPrice) : undefined,
      type,
    );
  }

  @Get('geocode')
  @ApiOperation({
    summary: 'Resolve address or Google Maps URL to coordinates',
  })
  async geocode(@Query('address') address: string) {
    // Detect Google Maps URLs (full links, shortened links, app share links)
    if (
      address.includes('google.com/maps') ||
      address.includes('goo.gl/maps') ||
      address.includes('maps.app.goo.gl') ||
      address.includes('maps.google.com')
    ) {
      const result = await this.geocodingService.resolveGoogleMapsUrl(address);
      if (result) return result;
    }

    // Fallback: geocode plain text address via Nominatim
    return this.geocodingService.geocodeAddress(address);
  }
}
