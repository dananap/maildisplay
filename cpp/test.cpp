#include <chrono>
#include <vector>
#include <cppgpio.hpp>
#include <array>
#include <algorithm>

using namespace GPIO;
using namespace std;

vector<array<bool, 7>> num = {
    {1, 1, 1, 1, 1, 1, 0},
    {0, 1, 1, 0, 0, 0, 0},
    {1, 1, 0, 1, 1, 0, 1},
    {1, 1, 1, 1, 0, 0, 1},
    {0, 1, 1, 0, 0, 1, 1},
    {1, 0, 1, 1, 0, 1, 1},
    {1, 0, 1, 1, 1, 1, 1},
    {1, 1, 1, 0, 0, 0, 0},
    {1, 1, 1, 1, 1, 1, 1},
    {1, 1, 1, 1, 0, 1, 1}};

int main()
{
    array<int, 4> Digits = {22, 27, 17, 24};
    vector<DigitalOut> digits;

    array<int, 7> Segments = {11, 4, 23, 8, 7, 10, 18};
    vector<DigitalOut> segments;

    for (int i = 0; i < Digits.size(); i++)
    {
        digits.push_back(DigitalOut(Digits[i]));
    }
    for (int i = 0; i < Segments.size(); i++)
    {
        segments.push_back(DigitalOut(Segments[i]));
    }
    // std::for_each(Digits.begin(), Digits.end(), [](int n) {
    //     digits.push_back(DigitalOut(n));
    // });

    // std::for_each(Segments.begin(), Segments.end(), [](int n) {
    //     segments.push_back(DigitalOut(n));
    // });

    int n[] = {1, 2, 3, 4};
    bool stop = false;

    while (!stop)
    {
        for (int i = 0; i < 4; i++)
        {
            // proms.push(digits[i].write(0));
            for (int j = 0; j < 7; j++)
            {
                num[n[i]][j] ? segments[j].on() : segments[j].off();
            }
            digits[i].off();
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            digits[i].on();
        }
    }

    return 0;
}