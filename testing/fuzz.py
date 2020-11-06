#!/usr/bin/python3

# Slightly change the location of each site
# Usage: python3 fuzz.py [

import sys
import os
import math
import random as rd


#This one is true
LAT_PER_KM = 5.92260282/658
#This one is not true, but you can kiss my confident little assertions
LON_PER_KM = 6.898664/((606+651)/2)


def is_num(s, nanAllowed=False):
    try:
        a = float(s)
    except ValueError:
        return False
    else:
        if math.isnan(a):
            return nanAllowed
        else:
            return True

if len(sys.argv) > 1:
    if sys.argv[1] == '-h' or sys.argv[1] == '--help':
        print('Adjust the latitude and longitude of each row of a .csv by 5-10 km in a random direction')
        print('Assumes latitude of about 30N, otherwise the distance a point is fuzzed may be off')
        print()
        print('Usage: [python3] ./fuzz.py [FILE] [POSTFIX]')
        print('\tFILE      The .csv file to be adjusted.')
        print('\tPOSTFIX   The string to append to the filename when writing the altered file. Defaults to "_fuzz"')
        exit(0)

    file_name = sys.argv[1]
else:
    file_name = input("filename: ")

if len(sys.argv) > 2:
    postfix = sys.argv[2]
else:
    postfix = "_fuzz"

with open(file_name, 'r') as f:
    # Make the first line of the csv into an array
    # of lowercase column names
    header_line = f.readline()
    headers = [i.lower().strip() for i in header_line[:-1].split(',')]
    lines = f.readlines()
    data = [i[:-1].split(',') for i in lines]

if 'latitude' not in headers:
    print("Aww, bloody nonsense this is. You ain't even got the latitude, see?")
    exit(1)
if 'longitude' not in headers:
    print("Aww, bloody nonsense this is. You ain't even got the longitude, see?")
    exit(1)

lat_index = headers.index('latitude')
lon_index = headers.index('longitude')
has_sites = 'site id' in headers
if has_sites:
    id_index = headers.index('site id')
    new_sites = {}

new_data = []
# for each row in the csv
if has_sites:
    # for each row with a location (lat, lon)
    for i, row in enumerate([row for row in data if is_num(row[lat_index]) and is_num(row[lon_index])]):
        if row[id_index] in new_sites:
            if (row[lat_index], row[lon_index]) != new_sites[row[id_index]]:
                print("Invalid at", i, "since", (row[lat_index], row[lon_index]), "!=", new_sites[row[id_index]])
                print()
        else:
            # Add new sites to a list
            new_sites[row[id_index]] = (row[lat_index], row[lon_index])
    print(len(data), "rows and", len(new_sites), "sites")

    for k, v in new_sites.items():
        hyp = 0.5+rd.random()*0.5
        theta = math.tau * rd.random()
        d_lat = hyp*math.sin(theta)*LAT_PER_KM
        d_lon = hyp*math.cos(theta)*LON_PER_KM
        new_sites[k] = (str(float(v[0])+d_lat), str(float(v[1])+d_lon))

    for row in data:
        if is_num(row[lat_index]) and is_num(row[lon_index]):
            new_row = row[:]
            site_loc = new_sites[row[id_index]]
            new_row[lat_index] = site_loc[0]
            new_row[lon_index] = site_loc[1]
            new_data.append(new_row)
        else:
            new_data.append(row[:])
else:
    for row in data:
        if is_num(row[lat_index]) and is_num(row[lon_index]):
            lat = float(row[lat_index])
            lon = float(row[lon_index])

            hyp = 0.5+rd.random()*0.5
            theta = math.tau * rd.random()
            d_lat = hyp*math.sin(theta)*LAT_PER_KM
            d_lon = hyp*math.cos(theta)*LON_PER_KM

            new_row = row[:]
            new_row[lat_index] = str(lat + d_lat)
            new_row[lon_index] = str(lon + d_lon)

            new_data.append(new_row)
        else:
            new_data.append(row[:])

file_name_split = file_name.split('.')
if len(file_name_split)>2 or (len(file_name_split) == 2 and file_name_split[0] != ''):
    file_name_split[-2] += postfix
    new_file_name = '.'.join(file_name_split)
else:
    new_file_name = file_name+postfix
print("Writing to:", new_file_name)

with open(new_file_name, 'w') as f:
    f.write(header_line)
    f.writelines([','.join([str(j) for j in i])+'\n' for i in new_data])
