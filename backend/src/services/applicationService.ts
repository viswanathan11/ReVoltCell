export interface ApplicationMatch {
  application: string;
  suitability: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_RECOMMENDED';
  reason: string;
}

export class ApplicationService {
  public static evaluateApplications(
    score: number,
    classification: string,
    voltageSag: number,
    temperatureRise: number
  ): ApplicationMatch[] {
    if (classification === 'UNSUITABLE' || score < 45) {
      return [
        {
          application: 'LOW_POWER_STORAGE',
          suitability: 'NOT_RECOMMENDED',
          reason: 'Excessive degradation or thermal risks detected. Cell must not be repurposed.',
        },
        {
          application: 'SOLAR_STORAGE',
          suitability: 'NOT_RECOMMENDED',
          reason: 'Unstable under continuous discharge cycles.',
        },
        {
          application: 'BACKUP_POWER',
          suitability: 'NOT_RECOMMENDED',
          reason: 'High risk of premature voltage collapse during backup events.',
        },
        {
          application: 'LED_LIGHTING',
          suitability: 'NOT_RECOMMENDED',
          reason: 'Recommended for materials recovery and recycling.',
        },
        {
          application: 'LOW_POWER_ELECTRONICS',
          suitability: 'NOT_RECOMMENDED',
          reason: 'Safety and stability criteria not satisfied.',
        },
      ];
    }

    if (classification === 'GOOD' || score >= 80) {
      return [
        {
          application: 'LOW_POWER_STORAGE',
          suitability: 'HIGH',
          reason: 'Stable voltage behavior and acceptable thermal response under controlled discharge.',
        },
        {
          application: 'SOLAR_STORAGE',
          suitability: 'HIGH',
          reason: 'Good cell health and low internal impedance suitable for buffered solar storage.',
        },
        {
          application: 'LED_LIGHTING',
          suitability: 'HIGH',
          reason: 'Consistent voltage output for regulated DC lighting arrays.',
        },
        {
          application: 'BACKUP_POWER',
          suitability: 'MEDIUM',
          reason: 'Reliable capacity buffer for non-critical standby power units.',
        },
        {
          application: 'LOW_POWER_ELECTRONICS',
          suitability: 'HIGH',
          reason: 'Safe for microcontrollers, sensors, and remote telemetry modules.',
        },
      ];
    }

    if (classification === 'FURTHER_EVALUATION' || score >= 65) {
      return [
        {
          application: 'LED_LIGHTING',
          suitability: 'HIGH',
          reason: 'Adequate discharge profile for constant-current LED drivers.',
        },
        {
          application: 'LOW_POWER_ELECTRONICS',
          suitability: 'HIGH',
          reason: 'Well-suited for low-drain hobbyist and stationary electronic devices.',
        },
        {
          application: 'LOW_POWER_STORAGE',
          suitability: 'MEDIUM',
          reason: 'Acceptable for lower-capacity auxiliary storage if monitored with active BMS.',
        },
        {
          application: 'SOLAR_STORAGE',
          suitability: 'LOW',
          reason: 'Elevated sag suggests reduced efficiency during daily deep cycling.',
        },
        {
          application: 'BACKUP_POWER',
          suitability: 'LOW',
          reason: 'Voltage drops quickly under higher pulse loads.',
        },
      ];
    }

    // LOW_PERFORMANCE (45 <= score < 65)
    return [
      {
        application: 'LOW_POWER_ELECTRONICS',
        suitability: 'MEDIUM',
        reason: 'Marginal performance; acceptable for small intermittent low-current loads only.',
      },
      {
        application: 'LED_LIGHTING',
        suitability: 'LOW',
        reason: 'Accelerated voltage drop will cause noticeable brightness dimming.',
      },
      {
        application: 'LOW_POWER_STORAGE',
        suitability: 'NOT_RECOMMENDED',
        reason: 'High internal resistance makes bank integration inefficient.',
      },
      {
        application: 'SOLAR_STORAGE',
        suitability: 'NOT_RECOMMENDED',
        reason: 'Unsuitable for cyclic duty with potential thermal accumulation.',
      },
      {
        application: 'BACKUP_POWER',
        suitability: 'NOT_RECOMMENDED',
        reason: 'Voltage drops too rapidly under emergency load demands.',
      },
    ];
  }
}
