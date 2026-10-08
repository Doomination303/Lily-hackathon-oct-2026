package com.lily.hackathon.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class Test {
    @GetMapping("path")
    public String testPath() {
        return "This is working correctly";
    }
    
}
