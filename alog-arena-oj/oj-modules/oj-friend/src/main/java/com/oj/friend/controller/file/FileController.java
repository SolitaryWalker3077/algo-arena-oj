package com.oj.friend.controller.file;

import com.oj.common.entity.Result;
import com.oj.file.entity.OSSResult;
import com.oj.friend.service.file.IFileService;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/file")
public class FileController {

    @Autowired
    private IFileService fileService;

    @PostMapping("/upload")
    public Result<OSSResult> upload(@RequestBody MultipartFile file) {
        return Result.success(fileService.upload(file));
    }
}
