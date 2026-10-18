//
//  RCTBibleDeptConfigModule.m
//  bibledept
//
//  Created by tuan.nguyen on 19/06/2022.
//

#import "RCTBibleDeptConfigModule.h"
#import <React/RCTLog.h>

@implementation RCTBibleDeptConfigModule

- (NSDictionary *)constantsToExport
{
  
  NSDictionary *config = [self JSONFromFile];
  RCTLogInfo(@"Loaded config: %@ ", config);
  return config;
}

- (NSDictionary *)JSONFromFile
{
  NSString *path = [[NSBundle mainBundle] pathForResource:@"config" ofType:@"json"];
  NSData *data = [NSData dataWithContentsOfFile:path];
  return [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:nil];
}

RCT_EXPORT_MODULE(BibleDeptConfig);

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
